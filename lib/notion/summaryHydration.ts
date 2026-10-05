import type { ExtendedRecordMap } from 'notion-types'
import { getBlockCollectionId, getBlockValue } from 'notion-utils'
import type { BlogIndex } from '../blog/types.ts'
import { extractSummary, getSummaryValue } from './summary.ts'
import { userId } from './userMentions.ts'

/** Only direct references of published index entries; never traverse article bodies. */
export async function hydrateSummaryMentions(
    index: BlogIndex,
    recordMap: ExtendedRecordMap,
    fetchBlocks: (ids: string[]) => Promise<ExtendedRecordMap['block']>,
    fetchCollections?: (ids: string[]) => Promise<ExtendedRecordMap['collection']>,
    fetchUsers?: (ids: string[]) => Promise<ExtendedRecordMap['notion_user']>,
): Promise<BlogIndex> {
    const missing = new Set<string>()
    const pages = new Set<string>()
    const missingUsers = new Set<string>()
    for (const entry of index.entries) {
        const page = getBlockValue(recordMap.block[entry.id])
        if (!page) continue
        for (const segment of getSummaryValue(page, recordMap) ?? []) {
            for (const decoration of segment[1] ?? []) {
                const person = userId(decoration)
                if (person && !recordMap.notion_user?.[person]) missingUsers.add(person)
                if (decoration[0] === 'p' && typeof decoration[1] === 'string') pages.add(decoration[1])
                if ((decoration[0] === 'eoi' || decoration[0] === 'p') && typeof decoration[1] === 'string' && decoration[1] && !recordMap.block[decoration[1]]) {
                    missing.add(decoration[1])
                }
            }
        }
    }
    const ids = [...missing]
    const blocks = { ...recordMap.block }
    for (let offset = 0; offset < ids.length; offset += 100) {
        const batch = ids.slice(offset, offset + 100)
        const fetched = await fetchBlocks(batch)
        for (const id of batch) {
            const record = fetched?.[id]
            const value = getBlockValue(record)
            // A missing/malformed response is not an explicit permission denial.
            const denied = record?.role === 'none' || (record?.value && 'role' in record.value && record.value.role === 'none')
            if (!value?.id && !denied) throw new Error('Incomplete Notion summary mention response')
            blocks[id] = record
        }
    }
    const collection = { ...recordMap.collection }
    const collectionIds = new Set<string>()
    for (const id of pages) {
        const block = getBlockValue(blocks[id])
        if (block?.type !== 'collection_view_page' && block?.type !== 'collection_view') continue
        const collectionId = getBlockCollectionId(block, recordMap)
        if (collectionId && !collection[collectionId]) collectionIds.add(collectionId)
    }
    if (collectionIds.size && fetchCollections) {
        const ids = [...collectionIds]
        for (let offset = 0; offset < ids.length; offset += 100) {
            const batch = ids.slice(offset, offset + 100)
            const fetched = await fetchCollections(batch)
            for (const id of batch) {
                const record = fetched?.[id]
                const denied = record?.role === 'none' || (record?.value && 'role' in record.value && record.value.role === 'none')
                if (!getBlockValue(record)?.id && !denied) throw new Error('Incomplete Notion summary collection response')
                collection[id] = record
            }
        }
    }
    const notion_user = { ...recordMap.notion_user }
    if (missingUsers.size && fetchUsers) {
        const ids = [...missingUsers]
        for (let offset = 0; offset < ids.length; offset += 100) {
            const batch = ids.slice(offset, offset + 100)
            const fetched = await fetchUsers(batch)
            for (const id of batch) {
                const record = fetched?.[id]
                const denied = record?.role === 'none' || (record?.value && 'role' in record.value && record.value.role === 'none')
                if (!getBlockValue(record)?.id && !denied) throw new Error('Incomplete Notion summary user response')
                notion_user[id] = record
            }
        }
    }
    if (!missing.size && !collectionIds.size && !missingUsers.size) return index
    const hydrated = { ...recordMap, block: blocks, collection, notion_user }
    return { ...index, entries: index.entries.map(entry => {
        const page = getBlockValue(blocks[entry.id])
        return page ? { ...entry, ...extractSummary(getSummaryValue(page, hydrated), hydrated) } : entry
    }) }
}
