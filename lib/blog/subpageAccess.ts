import type { ExtendedRecordMap } from 'notion-types'
import type { BlogIndex } from './types.ts'
import { getBlockValue } from 'notion-utils'
import { collectSubpages, isAuthorizedSubpage } from '../notion/subpages.ts'

export async function resolveSubpageAccess(
    parentId: string, pageId: string, index: BlogIndex,
    load: (id: string, revision: string) => Promise<ExtendedRecordMap>,
) {
    const parent = index.entries.find(entry => entry.id === parentId)
    const revision = parent && index.contentRevisions[parent.id]
    if (!parent || !revision) return null
    const parentMap = await load(parent.id, revision)
    const subpages = collectSubpages(parentMap, parent.id)
    const subpage = subpages.find(entry => entry.id === pageId)
    if (!subpage) return null
    const recordMap = await load(subpage.id, subpage.revision)
    if (!isAuthorizedSubpage(getBlockValue(recordMap.block[subpage.id]), subpage, recordMap)) return null
    return { parent, subpage, subpages, recordMap, parentMap }
}
