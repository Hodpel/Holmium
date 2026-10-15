import assert from 'node:assert/strict'
import test from 'node:test'
import type { ExtendedRecordMap } from 'notion-types'
import { getBlockValue } from 'notion-utils'
import { hydrateIndependentProperties } from './propertyCompatibility.ts'

const wrap = (value: unknown) => ({ value: { value, role: 'reader' }, spaceId: 'space' })
function fixture(state = 'stored_on_block_property_value') {
    const records = {
        collection_property_schema: { field: wrap({
            id: 'field', parent_id: 'db', property_short_id: 's',
            property_schema: { name: 'summary', type: 'text' },
            property_value_migration_status: { state },
        }) },
        block_property_value: { value: wrap({
            id: 'value', parent_id: 'page', property_short_id: 's', property_value: [['new', [['b']]]],
        }) },
    }
    const map = {
        collection: { db: wrap({ id: 'db', space_id: 'space', schema: { title: { name: 'title', type: 'title' } }, additional_property_ids: ['field'] }) },
        block: { page: wrap({ id: 'page', space_id: 'space', parent_id: 'db', type: 'page', properties: { title: [['Title']], s: [['old']] }, additional_property_ids: ['value'] }) },
    } as unknown as ExtendedRecordMap
    return { map, records }
}

test('legacy data is returned unchanged without requests', async () => {
    const { map } = fixture()
    const legacy = { collection: {}, block: map.block } as ExtendedRecordMap
    delete (getBlockValue(legacy.block.page) as unknown as { additional_property_ids?: string[] }).additional_property_ids
    assert.equal(await hydrateIndependentProperties(legacy, async () => assert.fail('unexpected request')), legacy)
})

test('mixed data is normalized without mutation, preserving formatting and record wrappers', async () => {
    const { map, records } = fixture()
    const before = structuredClone(map)
    const result = await hydrateIndependentProperties(map, async requests => {
        assert.deepEqual(requests.map(r => r.pointer.table), ['collection_property_schema', 'block_property_value'])
        assert.ok(requests.every(r => r.pointer.spaceId === 'space' && r.version === -1))
        return records
    })
    assert.deepEqual(map, before)
    assert.equal(getBlockValue(result.collection.db)?.schema.s.name, 'summary')
    assert.deepEqual(getBlockValue(result.block.page)?.properties?.s, [['new', [['b']]]])
    assert.deepEqual(getBlockValue(result.block.page)?.properties?.title, [['Title']])
    const repeated = await hydrateIndependentProperties(result, async () => assert.fail('already loaded'))
    assert.deepEqual(repeated, result)
})

test('migration state decides precedence; explicit empty values never revive stale text', async () => {
    const legacy = fixture('stored_on_block')
    const old = await hydrateIndependentProperties(legacy.map, async () => legacy.records)
    assert.deepEqual(getBlockValue(old.block.page)?.properties?.s, [['old']])
    const current = fixture()
    current.records.block_property_value.value = wrap({ id: 'value', parent_id: 'page', property_short_id: 's', property_value: [] })
    const empty = await hydrateIndependentProperties(current.map, async () => current.records)
    assert.deepEqual(getBlockValue(empty.block.page)?.properties?.s, [])
    delete (getBlockValue(current.map.block.page) as unknown as { additional_property_ids?: string[] }).additional_property_ids
    const absent = await hydrateIndependentProperties(current.map, async () => current.records)
    assert.deepEqual(getBlockValue(absent.block.page)?.properties?.s, [])
})

test('missing, denied, malformed and wrong-owner records fail instead of caching empty summaries', async () => {
    const { map, records } = fixture()
    await assert.rejects(hydrateIndependentProperties(map, async () => undefined), /Incomplete/)
    await assert.rejects(hydrateIndependentProperties(map, async () => { throw new Error('network') }), /network/)
    for (const value of [{ role: 'none' }, wrap({ id: 'value', parent_id: 'other', property_short_id: 's', property_value: [] }), wrap({ id: 'value', parent_id: 'page', property_short_id: 's' })]) {
        await assert.rejects(hydrateIndependentProperties(map, async () => ({ ...records, block_property_value: { value } })), /invalid/)
    }
})

test('independent records already supplied by upstream require no requests', async () => {
    const { map, records } = fixture()
    const result = await hydrateIndependentProperties({ ...map, ...records }, async () => assert.fail('already supplied'))
    assert.deepEqual(getBlockValue(result.block.page)?.properties?.s, [['new', [['b']]]])
})

test('missing records are deduplicated and fetched in bounded batches', async () => {
    const { map, records } = fixture()
    const db = getBlockValue(map.collection.db) as unknown as { additional_property_ids: string[] }
    db.additional_property_ids = Array.from({ length: 205 }, (_, i) => `f${i}`)
    db.additional_property_ids.push('f0')
    const sizes: number[] = []
    await hydrateIndependentProperties(map, async requests => {
        sizes.push(requests.length)
        return {
            block_property_value: records.block_property_value,
            collection_property_schema: Object.fromEntries(requests.filter(r => r.pointer.table === 'collection_property_schema').map(r => [r.pointer.id, wrap({ id: r.pointer.id, parent_id: 'db', property_short_id: 's', property_schema: { name: 'summary', type: 'text' } })])),
        }
    })
    assert.deepEqual(sizes, [100, 100, 6])
})
