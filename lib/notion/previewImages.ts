import lqipModern from 'lqip-modern'
import { getBlockCollectionId, getBlockValue, normalizeUrl } from 'notion-utils'
import type { Block, Decoration, ExtendedRecordMap, PreviewImage, PreviewImageMap } from 'notion-types'
import {
    getVideoThumbnailSource,
    resolvePreviewImageUrl,
    type MapImageUrl,
    VIDEO_PREVIEW_MAX_DIMENSION,
} from './videoPreview.ts'

type LoadPreviewImage = (url: string) => Promise<PreviewImage | null>
type LqipResult = {
    metadata: Pick<PreviewImage, 'originalWidth' | 'originalHeight' | 'dataURIBase64'>
}
type LqipOptions = {
    resize?: number
}
type CreateLqip = (input: ArrayBuffer, options?: LqipOptions) => Promise<LqipResult>

type LoadPreviewImageOptions = {
    fetchImage?: typeof fetch
    createLqip?: CreateLqip
    maxDimension?: number
    signal?: AbortSignal
}

const DEFAULT_PREVIEW_MAX_DIMENSION = 16
const SUPPORTED_RASTER_TYPES = new Set(['image/avif', 'image/gif', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

const createDefaultLqip: CreateLqip = (input, options) => lqipModern(input, options)

export function getPreviewImageMaxDimension(url: string, videoThumbnailUrls: ReadonlySet<string>): number {
    return videoThumbnailUrls.has(url) ? VIDEO_PREVIEW_MAX_DIMENSION : DEFAULT_PREVIEW_MAX_DIMENSION
}

function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError'
}

function getImageSource(block: Block): string | undefined {
    if (block.type !== 'image') return undefined
    return block.properties?.source?.[0]?.[0]
}

function getFilePropertySources(block: Block, recordMap: ExtendedRecordMap): string[] {
    const collectionId =
        getBlockCollectionId(block, recordMap) || (block.parent_table === 'collection' ? block.parent_id : undefined)
    const collection = collectionId ? getBlockValue(recordMap.collection[collectionId]) : undefined
    if (!collection) return []

    return Object.entries(collection.schema).flatMap(([propertyId, schema]) => {
        if (schema.type !== 'file') return []

        const data = block.properties?.[propertyId]
        const source = data?.[0]?.[1]?.find((decoration: Decoration) => decoration[0] === 'a')?.[1]
        return typeof source === 'string' ? [source] : []
    })
}

export function collectPreviewImageUrls(recordMap: ExtendedRecordMap, mapImageUrl: MapImageUrl): string[] {
    const urls = new Set<string>()

    for (const record of Object.values(recordMap.block)) {
        const block = getBlockValue(record)
        if (!block) continue

        const sources = [
            getImageSource(block),
            block.format?.page_cover,
            block.format?.bookmark_cover,
            getVideoThumbnailSource(block),
            ...getFilePropertySources(block, recordMap),
        ]
        for (const source of sources) {
            if (!source) continue
            const url = resolvePreviewImageUrl(source, block, recordMap, mapImageUrl)
            if (url) urls.add(url)
        }
    }

    return [...urls]
}

export async function buildPreviewImageMap(
    urls: readonly string[],
    loadPreviewImage: LoadPreviewImage,
    {
        concurrency = 4,
        signal,
        returnPartialOnAbort = false,
    }: { concurrency?: number; signal?: AbortSignal; returnPartialOnAbort?: boolean } = {},
): Promise<PreviewImageMap> {
    if (signal?.aborted) {
        if (returnPartialOnAbort) return {}
        throw signal.reason
    }

    const entries: Array<readonly [string, PreviewImage | null]> = new Array(urls.length)
    const workerCount = Math.min(urls.length, Math.max(1, Math.floor(concurrency)))
    let nextIndex = 0

    async function worker() {
        while (nextIndex < urls.length) {
            if (signal?.aborted && returnPartialOnAbort) return

            const index = nextIndex
            nextIndex += 1
            const url = urls[index]!

            try {
                entries[index] = [normalizeUrl(url), await loadPreviewImage(url)] as const
            } catch (error) {
                if (signal?.aborted) {
                    if (returnPartialOnAbort) return
                    throw signal.reason
                }
                if (isAbortError(error)) throw error
                entries[index] = [normalizeUrl(url), null] as const
            }
        }
    }

    await Promise.all(Array.from({ length: workerCount }, () => worker()))

    return Object.fromEntries(entries.filter((entry) => entry !== undefined))
}

export async function loadPreviewImage(
    url: string,
    {
        fetchImage = fetch,
        createLqip = createDefaultLqip,
        maxDimension = DEFAULT_PREVIEW_MAX_DIMENSION,
        signal,
    }: LoadPreviewImageOptions = {},
): Promise<PreviewImage | null> {
    const response = await fetchImage(url, { signal })
    if (!response.ok) return null

    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
    if (!contentType || !SUPPORTED_RASTER_TYPES.has(contentType)) return null

    const { metadata } = await createLqip(await response.arrayBuffer(), { resize: maxDimension })
    return {
        originalWidth: metadata.originalWidth,
        originalHeight: metadata.originalHeight,
        dataURIBase64: metadata.dataURIBase64,
    }
}
