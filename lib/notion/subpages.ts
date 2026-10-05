import type { Block, Decoration, ExtendedRecordMap } from 'notion-types'
import { getBlockCollectionId, getBlockValue, getTextContent, parsePageId } from 'notion-utils'

export type Subpage = { id: string; calloutId: string; revision: string; collectionId?: string; checkboxId?: string }

export function isAuthorizedSubpage(block: Block | undefined, page: Subpage, map: ExtendedRecordMap): boolean {
    if (!page.collectionId) return isOwnedSubpage(block, page.calloutId, map)
    return Boolean(block?.type === 'page' && block.alive !== false && block.parent_table === 'collection' &&
        normalizedId(block.parent_id) === normalizedId(page.collectionId) && page.checkboxId &&
        getTextContent((block.properties as Record<string, Decoration[]> | undefined)?.[page.checkboxId]) === 'Yes')
}

const CONTENT_CONTAINERS = new Set([
    'text', 'quote', 'callout', 'toggle', 'column', 'column_list', 'bulleted_list',
    'numbered_list', 'to_do', 'header', 'sub_header', 'sub_sub_header', 'header_4', 'tab',
])
const normalizedId = (id: string) => typeof id === 'string' ? parsePageId(id, { uuid: true }) || id : ''

export function isOwnedSubpage(block: Block | undefined, calloutId: string, map: ExtendedRecordMap): boolean {
    return Boolean(block?.type === 'page' && block.alive !== false && block.parent_table === 'block' &&
        normalizedId(block.parent_id) === normalizedId(calloutId) && !getBlockCollectionId(block, map))
}

/** Inspect only already-fetched, physically owned blocks in this article. */
export function collectSubpages(map: ExtendedRecordMap, rootId: string): Subpage[] {
    const entries: Subpage[] = []
    const visited = new Set<string>()
    const root = getBlockValue(map.block[normalizedId(rootId)])
    if (root?.type !== 'page' || root.alive === false) return entries

    const visit = (id: string, parentId: string) => {
        id = normalizedId(id)
        if (visited.has(id)) return
        visited.add(id)
        const block = getBlockValue(map.block[id])
        if (!block || block.alive === false || block.parent_table !== 'block' ||
            normalizedId(block.parent_id) !== normalizedId(parentId)) return

        if (block.type === 'collection_view' || block.type === 'collection_view_page') {
            const collectionId = getBlockCollectionId(block, map)
            const collection = collectionId && getBlockValue(map.collection?.[collectionId])
            // A linked view does not own the source collection, even if its rows are cached here.
            if (!collection || collection.parent_table !== 'block' || normalizedId(collection.parent_id) !== block.id) return
            const flags = Object.entries(collection.schema).filter(([, field]) => field.name === 'isSub' && field.type === 'checkbox')
            if (flags.length !== 1) return
            const checkboxId = flags[0][0]
            for (const record of Object.values(map.block)) {
                const row = getBlockValue(record)
                if (!row) continue
                const page = { id: row.id, calloutId: block.id, collectionId, checkboxId, revision: `${row.version ?? 0}:${row.last_edited_time ?? 0}` }
                if (isAuthorizedSubpage(row, page, map)) entries.push(page)
            }
            return
        }
        if (!CONTENT_CONTAINERS.has(block.type)) return

        if (block.type === 'callout' && block.content?.length && !getTextContent(block.properties?.title).trim() &&
            !block.format?.page_icon && [undefined, 'default', 'default_background'].includes(block.format?.block_color)) {
            const children = block.content.map(childId => getBlockValue(map.block[normalizedId(childId)]))
            if (children.every(child => isOwnedSubpage(child, block.id, map))) {
                for (const child of children) {
                    entries.push({ id: child!.id, calloutId: block.id, revision: `${child!.version ?? 0}:${child!.last_edited_time ?? 0}` })
                }
                return
            }
        }
        for (const childId of block.content ?? []) visit(childId, block.id)
    }
    for (const id of root.content ?? []) visit(id, root.id)
    return entries
}

/** Lift only authorized page links in the render copy; leave cached ownership intact. */
export function projectSubpageCallouts(map: ExtendedRecordMap, entries: readonly Subpage[]): ExtendedRecordMap {
    if (!entries.length) return map
    const containers = new Set(entries.filter(entry => !entry.collectionId).map(entry => entry.calloutId))
    if (!containers.size) return map
    let blocks: ExtendedRecordMap['block'] | undefined
    for (const [id, record] of Object.entries(map.block)) {
        const block = getBlockValue(record)
        if (!block?.content?.some(childId => containers.has(childId))) continue
        const content = block.content.flatMap(childId => containers.has(childId)
            ? getBlockValue(map.block[childId])!.content! : [childId])
        const normalized = { ...block, content }
        blocks ??= { ...map.block }
        const value = record.value
        blocks[id] = (value && typeof value === 'object' && 'value' in value
            ? { ...record, value: { ...value, value: normalized } }
            : { ...record, value: normalized }) as typeof record
    }
    return blocks ? { ...map, block: blocks } : map
}
