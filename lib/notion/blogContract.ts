import dayjs from 'dayjs'
import timezonePlugin from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import type { Block, Collection, CollectionQueryResult, ExtendedRecordMap } from 'notion-types'
import { getBlockCollectionId, getBlockValue, getDateValue, getPageProperty, idToUuid } from 'notion-utils'

import type { BlogEntrySummary, BlogIcon, BlogIndex } from '@/lib/blog/types'
import { extractSummary, getSummaryValue } from './summary'

dayjs.extend(utc)
dayjs.extend(timezonePlugin)

export type BlogContractErrorCode =
    | 'MISSING_TITLE'
    | 'MISSING_SLUG'
    | 'UNSAFE_SLUG'
    | 'DUPLICATE_SLUG'
    | 'MISSING_DATE'
    | 'UNKNOWN_STATUS'
    | 'UNKNOWN_TYPE'
    | 'PROPERTY_TYPE_MISMATCH'

export class BlogContractError extends Error {
    readonly code: BlogContractErrorCode
    readonly pageId?: string

    constructor(code: BlogContractErrorCode, message: string, pageId?: string) {
        super(message)
        this.name = 'BlogContractError'
        this.code = code
        this.pageId = pageId
    }
}

type BlogContractPropertyName = 'title' | 'slug' | 'tags' | 'date' | 'summary' | 'status' | 'type'

const EXPECTED_PROPERTY_TYPES: Record<BlogContractPropertyName, Collection['schema'][string]['type']> = {
    title: 'title',
    slug: 'text',
    tags: 'multi_select',
    date: 'date',
    summary: 'text',
    status: 'select',
    type: 'select',
}

const OPTIONAL_PROPERTIES = new Set<BlogContractPropertyName>(['summary', 'tags'])
const COMPACT_NOTION_ID = /^[0-9a-f]{32}$/i
const UNSAFE_ROUTE_CHARACTERS = /[%\\/?#\u0000-\u001f\u007f]/u
const RESERVED_ROUTE_SLUGS = new Set([
    'favicon.ico',
    'feed.xml',
    'page',
    'robots.txt',
    'search',
    'sitemap.xml',
    'tag',
])

export type BuildBlogIndexFromRecordMapOptions = {
    rootPageId: string
    recordMap: ExtendedRecordMap
    timezone: string
    now?: Date
    sortByDate?: boolean
}

export type BlogIndexErrorCode = 'INVALID_INDEX' | 'INCOMPLETE_INDEX'

export class BlogIndexError extends Error {
    readonly code: BlogIndexErrorCode

    constructor(code: BlogIndexErrorCode, message: string) {
        super(`Blog index ${code}: ${message}`)
        this.name = 'BlogIndexError'
        this.code = code
    }
}

function fail(code: BlogContractErrorCode, message: string, pageId: string): never {
    throw new BlogContractError(code, `Blog contract ${code} for page ${pageId}: ${message}`, pageId)
}

function getCollection(block: Block, recordMap: ExtendedRecordMap, pageId: string): Collection {
    const collection = getBlockValue(recordMap.collection?.[block.parent_id])
    if (!collection) fail('PROPERTY_TYPE_MISMATCH', 'the parent collection schema is missing', pageId)
    return collection
}

function validatePropertySchema(collection: Collection, pageId: string, names: BlogContractPropertyName[]): void {
    const schemaByName = new Map(
        Object.values(collection.schema).map((property) => [property.name.trim().toLocaleLowerCase('en-US'), property]),
    )

    for (const name of names) {
        const expectedType = EXPECTED_PROPERTY_TYPES[name]
        const property = schemaByName.get(name)
        if (!property && OPTIONAL_PROPERTIES.has(name)) continue
        if (!property || property.type !== expectedType) {
            fail(
                'PROPERTY_TYPE_MISMATCH',
                `${name} must use ${expectedType}; received ${property?.type ?? 'a missing schema property'}`,
                pageId,
            )
        }
    }
}

function requireTextProperty(
    name: 'title' | 'slug',
    block: Block,
    recordMap: ExtendedRecordMap,
    pageId: string,
): string {
    const value = getPageProperty<unknown>(name, block, recordMap)
    if (typeof value !== 'string' || !value.trim()) {
        fail(name === 'title' ? 'MISSING_TITLE' : 'MISSING_SLUG', `${name} is absent or blank`, pageId)
    }
    return value
}

function validateRouteSlug(slug: string, pageId: string): void {
    if (
        slug !== slug.trim() ||
        slug === '.' ||
        slug === '..' ||
        RESERVED_ROUTE_SLUGS.has(slug.toLocaleLowerCase('en-US')) ||
        UNSAFE_ROUTE_CHARACTERS.test(slug)
    ) {
        fail('UNSAFE_SLUG', `slug is not a safe single route segment: ${JSON.stringify(slug)}`, pageId)
    }
}

function readDate(block: Block, recordMap: ExtendedRecordMap, pageId: string, defaultTimezone: string): number {
    const collection = getCollection(block, recordMap, pageId)
    const propertyId = Object.keys(collection.schema).find(
        (key) => collection.schema[key]?.name.trim().toLocaleLowerCase('en-US') === 'date',
    )
    const property = propertyId ? block.properties?.[propertyId] : undefined
    const value = property ? getDateValue(property) : null

    if (!value || (value.type !== 'date' && value.type !== 'datetime')) {
        fail('MISSING_DATE', 'date is absent, invalid, or not a single Notion date', pageId)
    }
    if (value.type === 'datetime' && !value.start_time) {
        fail('MISSING_DATE', 'datetime is missing its start time', pageId)
    }

    const timezone = value.time_zone?.trim() || defaultTimezone
    const time = value.type === 'datetime' ? value.start_time! : '00:00'

    try {
        // Validate the configured IANA zone before passing it to dayjs. Notion
        // dates without an explicit zone use the blog's configured timezone.
        new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
        const parsed = dayjs.tz(`${value.start_date}T${time}`, timezone)
        if (
            !parsed.isValid() ||
            parsed.format('YYYY-MM-DD') !== value.start_date ||
            (value.type === 'datetime' && parsed.format('HH:mm') !== time.slice(0, 5))
        ) {
            fail('MISSING_DATE', 'date contains an invalid calendar date or time', pageId)
        }
        return parsed.valueOf()
    } catch (error) {
        if (error instanceof BlogContractError) throw error
        fail('MISSING_DATE', `date timezone is invalid: ${JSON.stringify(timezone)}`, pageId)
    }
}

function readStatus(block: Block, recordMap: ExtendedRecordMap, pageId: string): 'Published' | 'Draft' | null {
    const value = getPageProperty<unknown>('status', block, recordMap)
    if (value === '' || value === null || value === undefined) return null
    if (value !== 'Published' && value !== 'Draft') {
        fail('UNKNOWN_STATUS', `status must be Published or Draft; received ${JSON.stringify(value)}`, pageId)
    }
    return value
}

function readType(block: Block, recordMap: ExtendedRecordMap, pageId: string): 'Post' | 'Page' | null {
    const value = getPageProperty<unknown>('type', block, recordMap)
    if (value === '' || value === null || value === undefined) return null
    if (value !== 'Post' && value !== 'Page') {
        fail('UNKNOWN_TYPE', `type must be Post or Page; received ${JSON.stringify(value)}`, pageId)
    }
    return value
}

function failIndex(code: BlogIndexErrorCode, message: string): never {
    throw new BlogIndexError(code, message)
}

function normalizeNotionId(id: string): string {
    return COMPACT_NOTION_ID.test(id) ? idToUuid(id) : id
}

function getQueryPageIds(query: CollectionQueryResult): string[] {
    const pageIds =
        query.collection_group_results?.blockIds ??
        query.reducerResults?.collection_group_results.blockIds ??
        query.groupResults?.flatMap((group) => group.blockIds) ??
        query.blockIds ??
        []
    return [...new Set(pageIds.map(normalizeNotionId))]
}

function readRootIndexContext(rootPageId: string, recordMap: ExtendedRecordMap): {
    collectionId: string
    pageIds: string[]
} {
    const normalizedRootPageId = normalizeNotionId(rootPageId)
    const rootBlock = getBlockValue(recordMap.block[normalizedRootPageId])
    if (!rootBlock) failIndex('INVALID_INDEX', `root block ${normalizedRootPageId} is missing`)

    const rawCollectionId = getBlockCollectionId(rootBlock, recordMap)
    if (!rawCollectionId) failIndex('INVALID_INDEX', `root block ${normalizedRootPageId} does not reference a collection`)
    const collectionId = normalizeNotionId(rawCollectionId)

    const collection = getBlockValue(recordMap.collection?.[collectionId])
    if (!collection || !collection.schema || Object.keys(collection.schema).length === 0) {
        failIndex('INVALID_INDEX', `root collection ${collectionId} has no schema`)
    }

    const collectionQueries = recordMap.collection_query?.[collectionId]
    if (!collectionQueries) failIndex('INCOMPLETE_INDEX', `root collection ${collectionId} has no query result`)

    const rootViewIds =
        'view_ids' in rootBlock && Array.isArray(rootBlock.view_ids)
            ? rootBlock.view_ids.map(normalizeNotionId)
            : []
    const viewIds = rootViewIds.length ? rootViewIds : Object.keys(collectionQueries)
    if (!viewIds.length) failIndex('INVALID_INDEX', `root collection ${collectionId} has no view`)

    const pageIds = new Set<string>()
    for (const viewId of viewIds) {
        if (!getBlockValue(recordMap.collection_view?.[viewId])) {
            failIndex('INVALID_INDEX', `root collection view ${viewId} is missing`)
        }

        const query = collectionQueries[viewId]
        if (!query) failIndex('INCOMPLETE_INDEX', `root collection view ${viewId} has no query result`)
        if (
            query.collection_group_results?.hasMore === true ||
            query.reducerResults?.collection_group_results.hasMore === true
        ) {
            failIndex('INCOMPLETE_INDEX', `root collection view ${viewId} returned a truncated query`)
        }
        for (const pageId of getQueryPageIds(query)) pageIds.add(pageId)
    }

    return { collectionId, pageIds: [...pageIds] }
}

function readOptionalTags(block: Block, recordMap: ExtendedRecordMap): readonly string[] {
    const value = getPageProperty<unknown>('tags', block, recordMap)
    if (!Array.isArray(value)) return []
    return value.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0)
}

export function readIcon(block: Block): BlogIcon {
    const value = block.format?.page_icon
    if (typeof value !== 'string' || !value) return null

    if (
        value.startsWith('/') ||
        value.startsWith('attachment:') ||
        value.startsWith('https://') ||
        value.startsWith('http://')
    ) {
        return { kind: 'image', src: value }
    }

    return { kind: 'emoji', value }
}

function parseEntry(
    pageId: string,
    recordMap: ExtendedRecordMap,
    nowTimestamp: number,
    timezone: string,
): BlogEntrySummary | null {
    const block = getBlockValue(recordMap.block[pageId])
    if (!block || getBlockCollectionId(block, recordMap)) return null

    const collection = getCollection(block, recordMap, pageId)
    validatePropertySchema(collection, pageId, ['status'])
    const status = readStatus(block, recordMap, pageId)
    if (status !== 'Published') return null

    validatePropertySchema(collection, pageId, ['type'])
    const type = readType(block, recordMap, pageId)
    if (!type) return null

    validatePropertySchema(collection, pageId, ['date'])
    const date = readDate(block, recordMap, pageId, timezone)
    if (date > nowTimestamp) return null

    validatePropertySchema(collection, pageId, ['title', 'slug', 'tags', 'summary'])
    const title = requireTextProperty('title', block, recordMap, pageId)
    // Notion text properties preserve accidental leading and trailing spaces.
    // Normalize those spaces before route validation so a harmless editing
    // mistake cannot invalidate the entire blog index.
    const slug = requireTextProperty('slug', block, recordMap, pageId).trim()
    validateRouteSlug(slug, pageId)

    return {
        id: pageId,
        title,
        slug,
        kind: type === 'Post' ? 'post' : 'page',
        publishedAt: new Date(date).toISOString(),
        tags: readOptionalTags(block, recordMap),
        ...extractSummary(getSummaryValue(block, recordMap), recordMap),
        icon: readIcon(block),
        fullWidth: block.format?.page_full_width === true,
    }
}

function assertUniqueSlugs(entries: readonly BlogEntrySummary[]): void {
    const pageIdBySlug = new Map<string, string>()
    for (const entry of entries) {
        const slug = entry.slug
        const existingPageId = pageIdBySlug.get(slug)
        if (existingPageId) {
            fail('DUPLICATE_SLUG', `slug ${JSON.stringify(slug)} is also used by page ${existingPageId}`, entry.id)
        }
        pageIdBySlug.set(slug, entry.id)
    }
}

function readContentRevision(block: Block): string {
    return `${block.version ?? 0}:${block.last_edited_time ?? 0}`
}

function createBlogIndex(
    rootPageId: string,
    entries: BlogEntrySummary[],
    contentRevisions: Readonly<Record<string, string>>,
    sortByDate: boolean,
): BlogIndex {
    assertUniqueSlugs(entries)
    if (sortByDate) {
        entries.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    }

    return {
        rootPageId,
        entries,
        contentRevisions,
    }
}

export function buildBlogIndexFromRecordMap({
    rootPageId,
    recordMap,
    timezone,
    now = new Date(),
    sortByDate = false,
}: BuildBlogIndexFromRecordMapOptions): BlogIndex {
    const normalizedRootPageId = normalizeNotionId(rootPageId)
    const { collectionId, pageIds } = readRootIndexContext(normalizedRootPageId, recordMap)
    const nowTimestamp = now.getTime()
    const entries: BlogEntrySummary[] = []
    const contentRevisions: Record<string, string> = {}

    for (const pageId of pageIds) {
        const block = getBlockValue(recordMap.block[pageId])
        if (!block) failIndex('INCOMPLETE_INDEX', `query row ${pageId} is missing from the root RecordMap`)
        if (block.parent_table !== 'collection' || normalizeNotionId(block.parent_id) !== collectionId) {
            failIndex('INVALID_INDEX', `query row ${pageId} is not parented by root collection ${collectionId}`)
        }

        const entry = parseEntry(pageId, recordMap, nowTimestamp, timezone)
        if (entry) {
            entries.push(entry)
            contentRevisions[pageId] = readContentRevision(block)
        }
    }

    return createBlogIndex(normalizedRootPageId, entries, contentRevisions, sortByDate)
}
