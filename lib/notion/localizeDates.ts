import type { Block, ExtendedRecordMap, FormattedDate } from 'notion-types'
import { getBlockValue } from 'notion-utils'
import { formatNotionDate, type DateFormatContext, type NotionDate } from './dateFormat.ts'
export { formatNotionDate } from './dateFormat.ts'

// Render-only marker routed through the dependency's Link override into a span.
export const DATE_MENTION_PREFIX = 'holmium-date:'

type BlockWithProperties = {
    properties?: Record<string, unknown>
}

function isDateDecoration(value: unknown): value is ['d', FormattedDate] {
    if (!Array.isArray(value) || value[0] !== 'd') return false

    const date = value[1]
    return Boolean(date && typeof date === 'object' && 'start_date' in date && 'type' in date)
}

function localizeRichText(value: unknown, locale: string, context: DateFormatContext, defaults: Partial<NotionDate> = {}, body = false): unknown {
    if (!Array.isArray(value)) return value

    let changed = false
    const localized = value.map((segment) => {
        if (!Array.isArray(segment) || !Array.isArray(segment[1])) return segment

        const dateDecoration = segment[1].find(isDateDecoration)
        if (!dateDecoration) return segment

        const date = { ...defaults, ...dateDecoration[1] }
        const text = formatNotionDate(date, locale, context)
        if (!text) return segment

        changed = true
        const remainingDecorations = segment[1].filter((decoration) => !isDateDecoration(decoration))
        if ((body || date.date_format === 'relative') && !remainingDecorations.some(decoration => decoration[0] === 'a')) {
            const fullDate = date.date_format === 'relative' ? formatNotionDate({
                ...date, date_format: 'll', start_time: undefined, end_time: undefined,
                end_date: date.end_date === date.start_date ? undefined : date.end_date,
            }, locale) : null
            remainingDecorations.push(['a', `${DATE_MENTION_PREFIX}${encodeURIComponent(fullDate || '')}`])
        }
        return remainingDecorations.length ? [text, remainingDecorations] : [text]
    })

    return changed ? localized : value
}

export function localizeRecordMapDates(recordMap: ExtendedRecordMap, locale: string, context: DateFormatContext = {}): ExtendedRecordMap {
    let localizedBlocks: ExtendedRecordMap['block'] | null = null

    for (const [blockId, blockRecord] of Object.entries(recordMap.block)) {
        const block = getBlockValue(blockRecord) as (Block & BlockWithProperties) | undefined
        if (!block?.properties) continue

        let localizedProperties: Record<string, unknown> | null = null
        const collection = block.parent_table === 'collection' ? getBlockValue(recordMap.collection?.[block.parent_id]) : undefined
        for (const [propertyId, propertyValue] of Object.entries(block.properties)) {
            const schema = collection?.schema[propertyId] as ({ type: string } & Partial<NotionDate>) | undefined
            const defaults = schema?.type === 'date' ? { date_format: schema.date_format, time_format: schema.time_format } : undefined
            const localizedValue = localizeRichText(propertyValue, locale, context, defaults, block.type !== 'page')
            if (localizedValue === propertyValue) continue

            const nextProperties: Record<string, unknown> = localizedProperties ?? { ...block.properties }
            nextProperties[propertyId] = localizedValue
            localizedProperties = nextProperties
        }

        if (!localizedProperties) continue

        localizedBlocks ??= { ...recordMap.block }
        const localizedBlock = { ...block, properties: localizedProperties } as typeof block
        const value = blockRecord.value
        localizedBlocks[blockId] = (
            value && typeof value === 'object' && 'value' in value
                ? { ...blockRecord, value: { ...value, value: localizedBlock } }
                : { ...blockRecord, value: localizedBlock }
        ) as typeof blockRecord
    }

    return localizedBlocks ? { ...recordMap, block: localizedBlocks } : recordMap
}
