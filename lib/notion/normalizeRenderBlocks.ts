import type { Block, Decoration, ExtendedRecordMap } from 'notion-types'
import { getBlockValue, getTextContent } from 'notion-utils'
import { readWebMention, WEB_MENTION_PREFIX } from './webMention.ts'

export const UNAVAILABLE_LINK_MARKER = 'holmium-unavailable-link:'

const BACKGROUND_COLORS = new Set([
    'red_background', 'pink_background', 'blue_background',
    'purple_background', 'teal_background', 'yellow_background',
    'orange_background', 'brown_background', 'gray_background',
])
const HIGHLIGHT_MARKERS = new Set([
    'holmium-highlight-start', 'holmium-highlight-middle', 'holmium-highlight-end',
])

function hasBackground(segment: Decoration) {
    return segment[1]?.some(decoration => decoration[0] === 'h' && BACKGROUND_COLORS.has(decoration[1])) ?? false
}

function markConnectedBackgrounds(value: Decoration[] | undefined) {
    if (!value?.some(hasBackground)) return value
    let changed = false
    const marked = value.map((segment, index) => {
        const decorations = segment[1]
        const clean = decorations?.filter(decoration => decoration[0] !== 'h' || !HIGHLIGHT_MARKERS.has(decoration[1]))
        const background = hasBackground(segment)
        const joinsLeft = background && index > 0 && hasBackground(value[index - 1])
        const joinsRight = background && index + 1 < value.length && hasBackground(value[index + 1])
        const marker = joinsLeft && joinsRight ? 'holmium-highlight-middle'
            : joinsLeft ? 'holmium-highlight-end'
                : joinsRight ? 'holmium-highlight-start'
                    : undefined
        const existingMarker = decorations?.find(decoration => decoration[0] === 'h' && HIGHLIGHT_MARKERS.has(decoration[1]))?.[1]
        if (existingMarker === marker && clean?.length === (decorations?.length ?? 0) - (marker ? 1 : 0)) return segment
        if (!marker && clean?.length === decorations?.length) return segment
        changed = true
        return [segment[0], marker ? [...(clean ?? []), ['h', marker]] : clean] as Decoration
    })
    return changed ? marked : value
}

function markBackgroundProperties(properties: Record<string, Decoration[]> | undefined) {
    if (!properties) return properties
    let changed = false
    const marked = Object.fromEntries(Object.entries(properties).map(([key, value]) => {
        const normalized = markConnectedBackgrounds(value)
        if (normalized !== value) changed = true
        return [key, normalized]
    })) as typeof properties
    return changed ? marked : properties
}

function decodedBookmarkLink(link: Decoration[] | undefined) {
    let changed = false
    const decoded = link?.map(segment => {
        try {
            const text = decodeURI(segment[0])
            if (text === segment[0]) return segment
            changed = true
            return [text, segment[1]] as Decoration
        } catch {
            return segment
        }
    })
    return changed ? decoded : link
}

function deniedMentionTitle(title: Decoration[] | undefined, recordMap: ExtendedRecordMap) {
    let changed = false
    const normalized = title?.map(segment => {
        const mention = segment[1]?.find(decoration => decoration[0] === 'lm')
        if (mention) {
            changed = true
            return [readWebMention(mention[1]).title, [
                ...(segment[1]?.filter(decoration => decoration[0] !== 'lm' && decoration[0] !== 'a') ?? []),
                ['a', `${WEB_MENTION_PREFIX}${encodeURIComponent(JSON.stringify(mention[1]))}`],
            ]] as Decoration
        }
        const denied = segment[1]?.some(decoration => {
            if (decoration[0] !== 'eoi') return false
            const record = recordMap.block[decoration[1]]
            return record?.role === 'none' || Boolean(record?.value && 'role' in record.value && record.value.role === 'none')
        })
        if (!denied) return segment
        changed = true
        // The local Link override renders this marker as a non-interactive mention.
        return ['链接失效', [['a', UNAVAILABLE_LINK_MARKER]]] as Decoration
    })
    return changed ? normalized : title
}

function defaultStatusProperties(block: Block, recordMap: ExtendedRecordMap) {
    if (block.type !== 'page' || block.parent_table !== 'collection') return block.properties
    const collection = getBlockValue(recordMap.collection[block.parent_id])
    if (!collection?.schema) return block.properties
    let properties = block.properties
    for (const [id, schema] of Object.entries(collection.schema)) {
        if (schema.type !== 'status' || Object.hasOwn(block.properties ?? {}, id)) continue
        const defaultOption = (schema as typeof schema & { defaultOption?: string }).defaultOption
        if (!defaultOption || !schema.options?.some(option => option.value === defaultOption)) continue
        // Notion omits implicit defaults from row properties. Adapt only the
        // render copy so every collection layout receives the same status.
        properties = { ...properties, [id]: [[defaultOption]] } as typeof block.properties
    }
    return properties
}

// react-notion-x skips quotes without properties, including their children.
// PageTitle also needs a title to render unnamed child pages. Adapt the render
// copy only, retaining IDs, ownership, other properties and cached source data.
export function normalizeRenderBlocks(recordMap: ExtendedRecordMap): ExtendedRecordMap {
    let blocks: ExtendedRecordMap['block'] | undefined
    for (const [id, record] of Object.entries(recordMap.block)) {
        const block = getBlockValue(record)
        if (!block) continue
        const emptyQuote = block.type === 'quote' && !block.properties && Boolean(block.content?.length)
        const unnamedPage = block.type === 'page' && block.parent_table === 'block' && !getTextContent(block.properties?.title).trim()
        const originalTitle = block.properties?.title
        const mentionTitle = block.type === 'page' ? originalTitle : deniedMentionTitle(originalTitle, recordMap)
        const originalLink = block.properties?.link
        const bookmarkLink = block.type === 'bookmark' ? decodedBookmarkLink(originalLink) : originalLink
        const title = unnamedPage ? [['未命名', [['h', 'gray']]]] : emptyQuote ? [] : mentionTitle
        const statusProperties = defaultStatusProperties(block, recordMap)
        const preparedProperties = {
            ...statusProperties,
            ...(title !== originalTitle && { title }),
            ...(bookmarkLink !== originalLink && { link: bookmarkLink }),
        } as typeof block.properties
        const properties = markBackgroundProperties(preparedProperties)
        if (!emptyQuote && !unnamedPage && mentionTitle === originalTitle && bookmarkLink === originalLink && statusProperties === block.properties && properties === preparedProperties) continue
        const normalized = {
            ...block,
            properties,
        } as typeof block
        const value = record.value
        blocks ??= { ...recordMap.block }
        blocks[id] = (
            value && typeof value === 'object' && 'value' in value
                ? { ...record, value: { ...value, value: normalized } }
                : { ...record, value: normalized }
        ) as typeof record
    }
    return blocks ? { ...recordMap, block: blocks } : recordMap
}
