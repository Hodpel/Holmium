import 'server-only'

import { unstable_cache } from 'next/cache'
import { getBlockCollectionId, getBlockValue, getPageContentBlockIds, parsePageId } from 'notion-utils'
import type { CollectionInstance, CollectionQueryResult, CollectionView, CollectionViewMap, ExtendedRecordMap } from 'notion-types'

import config from '@/blog.config'
import serverConfig from '@/config/blog.server'
import type { BlogIndex } from '@/lib/blog/types'
import { buildBlogIndexFromRecordMap } from './blogContract'
import { hydrateSummaryMentions } from './summaryHydration'
import { mapNotionImageUrl } from './imageUrl'
import notion from './notionAPI'
import {
    buildPreviewImageMap,
    collectPreviewImageUrls,
    getPreviewImageMaxDimension,
    loadPreviewImage,
} from './previewImages'
import { executeNotionRequest } from './upstream'
import { collectVideoThumbnailUrls } from './videoPreview'
import { prepareFileSigning } from './fileResources'

type NotionSourceDescriptor = {
    rootPageId: string
    host: string
    timezone: string
}

function getSourceDescriptor(): NotionSourceDescriptor {
    if (!serverConfig.notionPageId) throw new Error('NOTION_PAGE_ID is required.')
    return { rootPageId: serverConfig.notionPageId, host: serverConfig.notionHost, timezone: config.timezone }
}

const COLLECTION_VIEW_BATCH_SIZE = 100
const COLLECTION_PAGE_LIMIT = 999
const PREVIEW_IMAGE_BUDGET_MS = 15_000

type CollectionViewRecordResponse = {
    recordMap?: {
        collection_view?: CollectionViewMap
    }
}

async function hydrateMissingCollectionViews(
    recordMap: ExtendedRecordMap,
    pageId: string,
    signal: AbortSignal,
): Promise<ExtendedRecordMap> {
    const rootPageId = parsePageId(pageId, { uuid: true }) || pageId
    const missingViewIds = new Set<string>()

    for (const blockId of getPageContentBlockIds(recordMap, rootPageId)) {
        const block = getBlockValue(recordMap.block[blockId])
        if (block?.type !== 'collection_view' && block?.type !== 'collection_view_page') continue

        for (const viewId of block.view_ids || []) {
            if (!getBlockValue(recordMap.collection_view[viewId])) missingViewIds.add(viewId)
        }
    }

    if (missingViewIds.size === 0) return recordMap

    const collectionView = { ...recordMap.collection_view }
    const viewIds = [...missingViewIds]

    try {
        for (let offset = 0; offset < viewIds.length; offset += COLLECTION_VIEW_BATCH_SIZE) {
            const batch = viewIds.slice(offset, offset + COLLECTION_VIEW_BATCH_SIZE)
            const response = await notion.fetch<CollectionViewRecordResponse>({
                endpoint: 'syncRecordValuesMain',
                body: {
                    requests: batch.map((id) => ({ id, table: 'collection_view', version: -1 })),
                },
                ofetchOptions: { retry: false, signal },
            })

            Object.assign(collectionView, response.recordMap?.collection_view)
        }
    } catch (error) {
        if (signal.aborted) throw error

        console.warn(
            JSON.stringify({
                event: 'notion_collection_view_hydration_failed',
                error: error instanceof Error ? error.name : 'UnknownError',
                viewCount: viewIds.length,
            }),
        )
    }

    return { ...recordMap, collection_view: collectionView }
}

function hasCollectionRowsResult(value: unknown): value is CollectionQueryResult {
    if (!value || typeof value !== 'object') return false

    const result = value as Record<string, unknown>
    return (
        'blockIds' in result ||
        'collection_group_results' in result ||
        Object.keys(result).some((key) => key.startsWith('results:'))
    )
}

function createUngroupedBoardView(view: CollectionView): CollectionView {
    const format = { ...(view.format || {}) } as Record<string, unknown>

    // notion-client 8.x detects modern board_columns_by, but still relies on
    // legacy board_columns to construct the per-group row reducers. Removing
    // grouping only for this fallback query makes it request one complete row
    // result; Holmium's Board model performs the visual grouping afterwards.
    delete format.board_columns_by
    delete format.board_columns
    delete format.board_groups2

    return { ...view, format } as CollectionView
}

function mergeCollectionQuery(
    recordMap: ExtendedRecordMap,
    collectionId: string,
    viewId: string,
    instance: CollectionInstance,
): ExtendedRecordMap {
    const query = instance.result?.reducerResults as CollectionQueryResult | undefined
    if (!hasCollectionRowsResult(query)) {
        throw new Error('Board fallback query returned no row result')
    }

    return {
        ...recordMap,
        block: { ...recordMap.block, ...instance.recordMap.block },
        collection: { ...recordMap.collection, ...instance.recordMap.collection },
        collection_view: { ...recordMap.collection_view, ...instance.recordMap.collection_view },
        notion_user: { ...recordMap.notion_user, ...instance.recordMap.notion_user },
        collection_query: {
            ...recordMap.collection_query,
            [collectionId]: {
                ...recordMap.collection_query[collectionId],
                [viewId]: query,
            },
        },
    }
}

function removeIncompleteCollectionQuery(
    recordMap: ExtendedRecordMap,
    collectionId: string,
    viewId: string,
): ExtendedRecordMap {
    const collectionQueries = { ...recordMap.collection_query[collectionId] }
    delete collectionQueries[viewId]

    return {
        ...recordMap,
        collection_query: {
            ...recordMap.collection_query,
            [collectionId]: collectionQueries,
        },
    }
}

async function hydrateIncompleteBoardQueries(
    initialRecordMap: ExtendedRecordMap,
    pageId: string,
    signal: AbortSignal,
): Promise<ExtendedRecordMap> {
    const rootPageId = parsePageId(pageId, { uuid: true }) || pageId
    const seen = new Set<string>()
    let recordMap = initialRecordMap

    for (const blockId of getPageContentBlockIds(recordMap, rootPageId)) {
        const block = getBlockValue(recordMap.block[blockId])
        if (block?.type !== 'collection_view' && block?.type !== 'collection_view_page') continue

        const viewId = block.view_ids?.[0]
        const view = viewId ? getBlockValue(recordMap.collection_view[viewId]) : undefined
        const collectionId = getBlockCollectionId(block, recordMap)
        if (!viewId || view?.type !== 'board' || !collectionId) continue

        const key = `${collectionId}:${viewId}`
        if (seen.has(key)) continue
        seen.add(key)

        const currentQuery = recordMap.collection_query[collectionId]?.[viewId]
        if (hasCollectionRowsResult(currentQuery)) continue

        try {
            const instance = await notion.getCollectionData(
                collectionId,
                viewId,
                createUngroupedBoardView(view),
                {
                    limit: COLLECTION_PAGE_LIMIT,
                    spaceId: block.space_id,
                    ofetchOptions: { retry: false, signal },
                },
            )
            recordMap = mergeCollectionQuery(recordMap, collectionId, viewId, instance)
        } catch (error) {
            if (signal.aborted) throw error

            recordMap = removeIncompleteCollectionQuery(recordMap, collectionId, viewId)
            console.warn(
                JSON.stringify({
                    event: 'notion_board_query_hydration_failed',
                    error: error instanceof Error ? error.name : 'UnknownError',
                    viewId,
                }),
            )
        }
    }

    return recordMap
}

async function loadBlogIndex(descriptor: NotionSourceDescriptor, sortByDate: boolean): Promise<BlogIndex> {
    return executeNotionRequest('blog-index', async (signal) => {
        const recordMap = await notion.getPage(descriptor.rootPageId, {
            fetchCollections: true,
            signFileUrls: false,
            throwOnCollectionErrors: true,
            collectionReducerLimit: 5000,
            ofetchOptions: { retry: false, signal },
        })
        const index = buildBlogIndexFromRecordMap({
            rootPageId: descriptor.rootPageId,
            recordMap,
            timezone: descriptor.timezone,
            sortByDate,
        })
        return hydrateSummaryMentions(index, recordMap, async ids => {
            const response = await notion.getBlocks(ids, { retry: false, signal })
            return response.recordMap?.block
        }, async ids => {
            const response = await notion.fetch<{ recordMap: Pick<ExtendedRecordMap, 'collection'> }>({
                endpoint: 'syncRecordValuesMain',
                body: { requests: ids.map(id => ({ id, table: 'collection', version: -1 })) },
                ofetchOptions: { retry: false, signal },
            })
            return response.recordMap?.collection
        }, async ids => {
            const response = await notion.fetch<{ results: ExtendedRecordMap['notion_user'][string][] }>({
                endpoint: 'getRecordValues',
                body: { requests: ids.map(id => ({ id, table: 'notion_user' })) },
                ofetchOptions: { retry: false, signal },
            })
            return Object.fromEntries(ids.map((id, index) => [id, response.results?.[index]]))
        })
    })
}

const getCachedBlogIndex = unstable_cache(loadBlogIndex, ['blog-index', 'summary-rich-text-v3'], { revalidate: 300 })

async function loadPageRecordMap(pageId: string): Promise<ExtendedRecordMap> {
    return executeNotionRequest('blog-page', async (signal) => {
        const recordMap = await notion.getPage(pageId, {
            signFileUrls: false,
            ofetchOptions: { retry: false, signal },
        })
        const withViews = await hydrateMissingCollectionViews(recordMap, pageId, signal)
        const withBoards = await hydrateIncompleteBoardQueries(withViews, pageId, signal)
        const signingMap = prepareFileSigning(withBoards)
        await notion.addSignedUrls({ recordMap: signingMap, ofetchOptions: { retry: false, signal } })
        withBoards.signed_urls = signingMap.signed_urls
        const previewImageUrls = collectPreviewImageUrls(withBoards, mapNotionImageUrl)
        const videoThumbnailUrls = new Set(collectVideoThumbnailUrls(withBoards, mapNotionImageUrl))
        const previewSignal = AbortSignal.any([signal, AbortSignal.timeout(PREVIEW_IMAGE_BUDGET_MS)])
        const previewImages = await buildPreviewImageMap(
            previewImageUrls,
            (url) =>
                loadPreviewImage(url, {
                    maxDimension: getPreviewImageMaxDimension(url, videoThumbnailUrls),
                    signal: previewSignal,
                }),
            { concurrency: 4, signal: previewSignal, returnPartialOnAbort: true },
        )

        return { ...withBoards, preview_images: previewImages }
    })
}

const getCachedPageRecordMap = unstable_cache(async (
    descriptor: NotionSourceDescriptor,
    pageId: string,
    contentRevision: string,
): Promise<ExtendedRecordMap> => {
    // The index revision catches edits to the page itself, but Notion does not
    // update that revision when an inline database changes. The periodic
    // refresh also covers those edits; the page's ISR result is responsible
    // for serving old content while a complete replacement is rendered.
    void descriptor
    void contentRevision
    return loadPageRecordMap(pageId)
}, ['blog-page'], { revalidate: 300 })

export async function getBlogIndex(sortByDate = false): Promise<BlogIndex> {
    const descriptor = getSourceDescriptor()
    return getCachedBlogIndex(descriptor, sortByDate)
}

export async function getPageRecordMap(pageId: string, contentRevision: string): Promise<ExtendedRecordMap> {
    const descriptor = getSourceDescriptor()
    return getCachedPageRecordMap(descriptor, pageId, contentRevision)
}
