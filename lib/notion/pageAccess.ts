import 'server-only'
import { cache } from 'react'
import { parsePageId } from 'notion-utils'
import config from '@/blog.config'
import { getBlogIndex, getPageRecordMap } from './dataSource'
import { resolveSubpageAccess } from '@/lib/blog/subpageAccess'

export const getSubpageAccess = cache(async (rawParentId: string, rawPageId: string) => {
    const parentId = parsePageId(rawParentId, { uuid: true })
    const pageId = parsePageId(rawPageId, { uuid: true })
    if (!parentId || !pageId || parentId === pageId) return null
    const index = await getBlogIndex(config.sortByDate)
    const access = await resolveSubpageAccess(parentId, pageId, index, getPageRecordMap)
    return access ? { ...access, index } : null
})

/** Shared by media routes; a supplied parent ID never grants access on its own. */
export async function getAccessiblePageRecordMap(pageId: string, parentId: string | null) {
    if (parentId !== null) return (await getSubpageAccess(parentId, pageId))?.recordMap ?? null
    const index = await getBlogIndex(config.sortByDate)
    const entry = index.entries.find(candidate => candidate.id === pageId)
    const revision = entry && index.contentRevisions[entry.id]
    return revision ? getPageRecordMap(pageId, revision) : null
}
