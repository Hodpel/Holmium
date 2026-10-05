import config from '@/blog.config'
import { cache } from 'react'
import type { BlogEntrySummary } from '@/lib/blog/types'
import { resolvePostSnapshot } from '@/lib/blog/postSnapshot'
import type { ExtendedRecordMap } from 'notion-types'
import { getBlogIndex, getPageRecordMap } from './dataSource'
import { projectHtmlArtifactUrls } from './htmlArtifacts'
import { projectFileUrls } from './fileResources'
import { buildNotionPageHrefMap } from './pageLinks'
import { collectSubpages, projectSubpageCallouts } from './subpages'
import { readableSubpageHref, findSubpageBySegment } from './subpageSlugs'
import { getSubpageAccess } from './pageAccess'
import { getBlockValue, getTextContent, parsePageId, uuidToId } from 'notion-utils'
import { readIcon } from './blogContract'
import advancedConfig from '@/config/blog.advanced'

function subpageLinks(parentSlug: string, map: ExtendedRecordMap, pages: ReturnType<typeof collectSubpages>) {
    const ids = pages.map(page => page.id)
    return Object.fromEntries(pages.map(page => [uuidToId(page.id), readableSubpageHref(parentSlug,
        getTextContent(getBlockValue(map.block[page.id])?.properties?.title), page.id, ids)]))
}

export const getSubpageBySlug = cache(async (parentSlug: string, segment: string) => {
    const index = await getBlogIndex(config.sortByDate)
    const parent = index.entries.find(entry => entry.slug === parentSlug)
    if (!parent || !index.contentRevisions[parent.id]) return null
    const map = await getPageRecordMap(parent.id, index.contentRevisions[parent.id])
    const id = findSubpageBySegment(segment, collectSubpages(map, parent.id).map(page => page.id))
    return id ? getSubpageSnapshot(parent.id, id) : null
})

async function getPostRecordMap(id: string, contentRevision: string): Promise<ExtendedRecordMap> {
    const recordMap = await getPageRecordMap(id, contentRevision)
    return projectFileUrls(projectHtmlArtifactUrls(recordMap, id), id)
}

/** Share one complete snapshot between metadata and body in the same render.
 * The route's ISR cache, not this request-local memo, retains the old page. */
export const getPostSnapshot = cache(async (slug: string) => {
    const index = await getBlogIndex(config.sortByDate)
    const snapshot = await resolvePostSnapshot(slug, index, getPostRecordMap)
    if (!snapshot) return null
    const subpages = collectSubpages(snapshot.recordMap, snapshot.post.id)
    return {
        ...snapshot,
        recordMap: projectSubpageCallouts(snapshot.recordMap, subpages),
        pageHrefMap: {
            ...buildNotionPageHrefMap(index, config.path || '/'),
            ...subpageLinks(snapshot.post.slug, snapshot.recordMap, subpages),
        },
    }
})

export const getSubpageSnapshot = cache(async (parentId: string, pageId: string) => {
    const access = await getSubpageAccess(parentId, pageId)
    if (!access) return null
    const { parent, subpage, recordMap, index, subpages, parentMap } = access
    const block = getBlockValue(recordMap.block[subpage.id])!
    const post: BlogEntrySummary = {
        id: subpage.id,
        slug: readableSubpageHref(parent.slug, getTextContent(block.properties?.title), subpage.id, subpages.map(page => page.id)).slice(1),
        kind: 'sub',
        title: getTextContent(block.properties?.title).trim() || '未命名',
        icon: readIcon(block),
        fullWidth: block.format?.page_full_width === true,
        publishedAt: parent.publishedAt,
        tags: [],
        summary: null,
    }
    return {
        post,
        parentHref: `/${encodeURIComponent(parent.slug)}`,
        recordMap: projectFileUrls(projectHtmlArtifactUrls(recordMap, post.id, parent.id), post.id, parent.id),
        pageHrefMap: {
            ...buildNotionPageHrefMap(index, config.path || '/'),
            ...subpageLinks(parent.slug, parentMap, subpages),
        },
    }
})

export default async function getPostsList({
    includePages = false,
}: {
    includePages?: boolean
}): Promise<BlogEntrySummary[]> {
    const index = await getBlogIndex(config.sortByDate)
    if (includePages) return [...index.entries]
    const specialPageIds = new Set(advancedConfig.specialPages.map(({ pageId }) => parsePageId(pageId, { uuid: true }) || pageId))
    return index.entries.filter((entry) => entry.kind === 'post' && !specialPageIds.has(entry.id))
}
