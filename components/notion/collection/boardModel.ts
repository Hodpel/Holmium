import type {
    Collection,
    CollectionQueryResult,
    CollectionView,
    Decoration,
    ExtendedRecordMap,
    PageBlock,
    SelectOption,
} from 'notion-types'
import { getBlockValue, getTextContent } from 'notion-utils'

type BoardGroupValue = {
    type?: string
    value?: string | { option?: string; value?: string }
}

type BoardGroup = {
    hidden?: boolean
    property?: string
    value?: BoardGroupValue
}

type BoardFormat = {
    board_columns?: BoardGroup[]
    board_groups2?: BoardGroup[]
    board_columns_by?: {
        property?: string
        hideEmptyGroups?: boolean
    }
    board_properties?: Array<{ property: string; visible: boolean }>
}

type QueryResultBucket = {
    blockIds?: string[]
}

type BoardPropertySchema = Collection['schema'][string] & {
    defaultOption?: string
}

export type BoardCardModel = {
    block: PageBlock
    id: string
    properties: BoardCardPropertyModel[]
    title: string
}

export type BoardCardPropertyModel = {
    data: Decoration[] | undefined
    id: string
    schema: Collection['schema'][string]
}

export type BoardColumnModel = {
    cards: BoardCardModel[]
    color: string
    id: string
    name: string
}

export type BoardModel = {
    columns: BoardColumnModel[]
}

// PageBlock only declares the title property; collection rows also carry schema-defined keys.
export function getBoardPageProperties(block: PageBlock): Readonly<Record<string, Decoration[] | undefined>> {
    return block.properties || {}
}

function readGroupName(group: BoardGroup): string {
    const value = group.value?.value
    if (typeof value === 'string') return value
    return value?.option || value?.value || ''
}

function getQueryBlockIds(collectionData: CollectionQueryResult): string[] {
    const data = collectionData as CollectionQueryResult & Record<string, unknown>
    const ids = [
        ...(collectionData.blockIds || []),
        ...(collectionData.collection_group_results?.blockIds || []),
        ...(collectionData.reducerResults?.collection_group_results?.blockIds || []),
    ]

    for (const [key, value] of Object.entries(data)) {
        if (!key.startsWith('results:')) continue
        const bucket = value as QueryResultBucket | undefined
        if (bucket?.blockIds) ids.push(...bucket.blockIds)
    }

    return [...new Set(ids)]
}

function getPageBlock(
    blockId: string,
    recordMap: ExtendedRecordMap,
    collectionData: CollectionQueryResult,
): PageBlock | undefined {
    const queryRecordMap = collectionData.recordMap
    const block = getBlockValue(recordMap.block[blockId]) || getBlockValue(queryRecordMap?.block[blockId])
    return block?.type === 'page' ? block : undefined
}

function getOptionColor(options: SelectOption[] | undefined, value: string): string {
    return options?.find((option) => option.value === value)?.color || 'default'
}

function getCardGroupName(
    block: PageBlock,
    propertyId: string,
    schema: BoardPropertySchema,
): string {
    const value = getTextContent(getBoardPageProperties(block)[propertyId]).trim()
    if (value) return value

    // Current Notion status properties omit the row property when it still has
    // the database's default status. Prefer that explicit default; older
    // payloads without defaultOption fall back to their first status option.
    if (schema.type === 'status') return schema.defaultOption || schema.options?.[0]?.value || ''
    return ''
}

/**
 * Normalizes legacy and current Notion board payloads without mutating the
 * RecordMap. Current Notion payloads describe grouping through
 * `board_columns_by`; older react-notion-x fixtures use `board_columns` or
 * `board_groups2` plus per-group query buckets.
 */
export function buildBoardModel({
    collection,
    collectionData,
    collectionView,
    recordMap,
    untitledLabel = 'Untitled',
}: {
    collection: Collection
    collectionData: CollectionQueryResult
    collectionView: CollectionView
    recordMap: ExtendedRecordMap
    untitledLabel?: string
}): BoardModel | null {
    const format = collectionView.format as BoardFormat | undefined
    const configuredGroups = format?.board_columns || format?.board_groups2 || []
    const propertyId = format?.board_columns_by?.property || configuredGroups[0]?.property
    if (!propertyId) return null

    const schema = collection.schema[propertyId]
    if (!schema || (schema.type !== 'status' && schema.type !== 'select')) return null

    const visibleProperties = (format?.board_properties || []).flatMap(({ property, visible }) => {
        const propertySchema = collection.schema[property]
        return visible && property !== 'title' && propertySchema
            ? [{ id: property, schema: propertySchema }]
            : []
    })

    const cards = getQueryBlockIds(collectionData)
        .map((blockId) => getPageBlock(blockId, recordMap, collectionData))
        .filter((block): block is PageBlock => Boolean(block))
        .map((block) => ({
            block,
            id: block.id,
            properties: visibleProperties
                .map(({ id, schema: propertySchema }) => ({
                    data: getBoardPageProperties(block)[id],
                    id,
                    schema: propertySchema,
                }))
                .filter(({ data, schema }) =>
                    // These properties can render a value without a stored cell value.
                    schema.type === 'checkbox' ||
                    schema.type === 'created_time' ||
                    schema.type === 'last_edited_time' ||
                    schema.type === 'formula' ||
                    data?.some(([text, decorations]) => text.trim().length > 0 || Boolean(decorations?.length)),
                ),
            title: getTextContent(block.properties?.title).trim() || untitledLabel,
        }))

    const configuredNames = configuredGroups.filter((group) => !group.hidden).map(readGroupName)
    const optionNames = schema.options?.map((option) => option.value) || []
    const cardNames = cards.map((card) => getCardGroupName(card.block, propertyId, schema))
    const hasLegacyGroups = configuredGroups.length > 0
    const names = [...new Set(hasLegacyGroups ? configuredNames : [...optionNames, ...cardNames])]
    const hasUncategorized = cardNames.some((name) => !name)
    if (!hasLegacyGroups && hasUncategorized && !names.includes('')) names.unshift('')

    const hideEmptyGroups = format?.board_columns_by?.hideEmptyGroups === true
    const columns = names
        .map((name) => ({
            cards: cards.filter(
                (card) => getCardGroupName(card.block, propertyId, schema) === name,
            ),
            color: getOptionColor(schema.options, name),
            id: name || 'uncategorized',
            name,
        }))
        .filter((column) => !hideEmptyGroups || column.cards.length > 0)

    return { columns }
}
