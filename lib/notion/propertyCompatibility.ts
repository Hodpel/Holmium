import type { Block, Collection, Decoration, ExtendedRecordMap } from 'notion-types'
import { getBlockValue } from 'notion-utils'

// Temporary Notion wire-format adapter. Remove with its dataSource hooks/cache
// keys once notion-client normalizes independent schemas AND values (including
// collection query results). Keep old/new/mixed-format regression coverage when
// validating that upgrade; a package version alone is not a removal criterion.
type PropertyTable = 'collection_property_schema' | 'block_property_value'
export type PropertyRequest = {
    pointer: { id: string; table: PropertyTable; spaceId: string }
    version: -1
}
export type PropertyRecords = Partial<Record<PropertyTable, Record<string, unknown>>>
type Owner = { id: string; space_id?: string; additional_property_ids?: string[] }
type Schema = {
    id: string
    parent_id: string
    property_short_id: string
    alive?: boolean
    property_schema: Collection['schema'][string]
    property_value_migration_status?: { state: string }
}
type Value = {
    id: string
    parent_id: string
    property_short_id: string
    property_value: Decoration[]
}

function valueOf<T>(record: unknown): T | undefined {
    if (!record || typeof record !== 'object') return undefined
    const wrapper = record as { role?: string; value?: unknown; id?: string }
    if (wrapper.role === 'none') return undefined
    if (typeof wrapper.id === 'string') return record as T
    return valueOf<T>(wrapper.value)
}

function replaceValue<T>(record: T, value: unknown): T {
    const wrapper = record as { id?: string; value?: unknown }
    return (wrapper.id ? value : { ...wrapper, value: replaceValue(wrapper.value, value) }) as T
}

/** Normalize at the server boundary so all property readers share one format. */
export async function hydrateIndependentProperties(
    source: ExtendedRecordMap,
    fetchRecords: (requests: PropertyRequest[]) => Promise<PropertyRecords | undefined>,
): Promise<ExtendedRecordMap> {
    const extra = source as ExtendedRecordMap & PropertyRecords
    const records: Required<PropertyRecords> = {
        collection_property_schema: { ...extra.collection_property_schema },
        block_property_value: { ...extra.block_property_value },
    }
    const owners: [PropertyTable, Owner][] = [
        ...Object.values(source.collection).map(record =>
            ['collection_property_schema', getBlockValue(record)] as [PropertyTable, Owner]),
        ...Object.values(source.block).map(record =>
            ['block_property_value', getBlockValue(record)] as [PropertyTable, Owner]),
    ].filter(([, owner]) => owner?.additional_property_ids?.length)
    if (!owners.length) return source

    const pending = new Map<string, PropertyRequest>()
    for (const [table, owner] of owners) {
        for (const id of owner.additional_property_ids ?? []) {
            if (records[table][id] !== undefined) continue
            if (!owner.space_id) throw new Error('Missing Notion property space ID')
            pending.set(`${table}:${id}`, { pointer: { id, table, spaceId: owner.space_id }, version: -1 })
        }
    }
    const requests = [...pending.values()]
    // Serial bounded batches avoid unbounded per-article requests and share the
    // caller's timeout/retry policy. Only missing independent records are fetched.
    for (let offset = 0; offset < requests.length; offset += 100) {
        const batch = requests.slice(offset, offset + 100)
        const fetched = await fetchRecords(batch)
        for (const { pointer: { table, id } } of batch) {
            const record = fetched?.[table]?.[id]
            if (record === undefined) throw new Error('Incomplete Notion independent property response')
            records[table][id] = record
        }
    }

    const collection = { ...source.collection }
    const block = { ...source.block }
    const migrated = new Map<string, Set<string>>()
    for (const [table, owner] of owners) {
        if (table !== 'collection_property_schema') continue
        const original = getBlockValue(collection[owner.id])!
        const schema = { ...original.schema }
        const fields = new Set<string>()
        for (const id of owner.additional_property_ids ?? []) {
            const field = valueOf<Schema>(records[table][id])
            if (!field || field.id !== id || field.parent_id !== owner.id || !field.property_short_id || !field.property_schema) {
                throw new Error('Unavailable or invalid Notion independent property schema')
            }
            const key = field.property_short_id
            if (field.alive === false) { delete schema[key]; continue }
            schema[key] = field.property_schema
            if (field.property_value_migration_status?.state === 'stored_on_block_property_value') fields.add(key)
        }
        migrated.set(owner.id, fields)
        collection[owner.id] = replaceValue(collection[owner.id], { ...original, schema })
    }

    for (const [id, record] of Object.entries(block)) {
        const original = getBlockValue(record) as (Block & Owner) | undefined
        if (!original) continue
        const fields = migrated.get(original.parent_id)
        if (!original.additional_property_ids?.length && !fields?.size) continue
        const properties = { ...original.properties }
        // A migrated field without a value record is empty. Never resurrect a
        // legacy value left behind during migration, including empty tags.
        for (const key of fields ?? []) properties[key] = []
        for (const propertyId of original.additional_property_ids ?? []) {
            const field = valueOf<Value>(records.block_property_value[propertyId])
            if (!field || field.id !== propertyId || field.parent_id !== id || !field.property_short_id || !Array.isArray(field.property_value)) {
                throw new Error('Unavailable or invalid Notion independent property value')
            }
            const key = field.property_short_id
            const schema = getBlockValue(collection[original.parent_id])?.schema[key]
            if (!schema) throw new Error('Missing Notion independent property schema')
            if (fields?.has(key) || properties[key] === undefined) properties[key] = field.property_value
        }
        block[id] = replaceValue(record, { ...original, properties })
    }
    return { ...source, ...records, collection, block }
}
