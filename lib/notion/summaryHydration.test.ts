import assert from 'node:assert/strict'
import test from 'node:test'
import type { ExtendedRecordMap } from 'notion-types'
import type { BlogIndex } from '../blog/types.ts'
import { hydrateSummaryMentions } from './summaryHydration.ts'

function fixture(ids = ['missing', 'missing']) {
    const map = { block: {
        page: { value: { id: 'page', type: 'page', parent_id: 'db', properties: {
            summary: ids.map(id => ['‣', [['eoi', id]]]), title: [['Title']],
        } } },
        draft: { value: { id: 'draft', type: 'page', parent_id: 'db', properties: { summary: [['‣', [['eoi', 'draft-only']]]] } } },
    }, collection: { db: { value: { id: 'db', schema: { summary: { name: 'summary', type: 'text' } } } } } } as unknown as ExtendedRecordMap
    const index = { rootPageId: 'root', contentRevisions: { page: '1' }, entries: [{ id: 'page', summary: '链接' }] } as unknown as BlogIndex
    return { map, index }
}

test('fetches only unique missing references from indexed summaries and publishes resolved text', async () => {
    const { map, index } = fixture()
    const result = await hydrateSummaryMentions(index, map, async ids => {
        assert.deepEqual(ids, ['missing'])
        return { missing: { value: { id: 'missing', type: 'external_object_instance', format: {
            original_url: 'https://github.com/example/project', attributes: [{ id: 'title', values: ['Example project'] }],
        } } } } as unknown as ExtendedRecordMap['block']
    })
    assert.equal(result.entries[0].summary, 'Example projectExample project')
    assert.equal(result.entries[0].summaryParts?.[0].type, 'mention')
    assert.equal(map.block.missing, undefined)
    assert.equal(index.entries[0].summary, '链接')
})

test('missing page mentions are deduplicated and resolved without fetching their bodies', async () => {
    const { map, index } = fixture()
    const page = map.block.page.value as unknown as { properties: { summary: unknown } }
    page.properties.summary = [['‣', [['p', 'target']]], ['‣', [['p', 'target']]]]
    const result = await hydrateSummaryMentions(index, map, async ids => {
        assert.deepEqual(ids, ['target'])
        return { target: { value: { id: 'target', type: 'page', content: ['do-not-fetch'], properties: { title: [['目标页']] } } } } as unknown as ExtendedRecordMap['block']
    })
    assert.equal(result.entries[0].summary, '目标页目标页')
})

test('database mentions fetch only missing collection metadata, not database rows', async () => {
    const { map, index } = fixture()
    const page = map.block.page.value as unknown as { properties: { summary: unknown } }
    page.properties.summary = [['‣', [['p', 'database']]]]
    map.block.database = { value: { id: 'database', type: 'collection_view_page', collection_id: 'metadata' } } as unknown as ExtendedRecordMap['block'][string]
    const result = await hydrateSummaryMentions(index, map, async () => { assert.fail('already have block') }, async ids => {
        assert.deepEqual(ids, ['metadata'])
        return { metadata: { value: { id: 'metadata', name: [['新数据库']] } } } as unknown as ExtendedRecordMap['collection']
    })
    assert.equal(result.entries[0].summary, '新数据库')
    assert.equal(map.collection.metadata, undefined)
})

test('missing people are fetched once and names are cached without reading bodies', async () => {
    const { map, index } = fixture()
    const page = map.block.page.value as unknown as { properties: { summary: unknown } }
    page.properties.summary = [['‣', [['u', 'person']]], ['‣', [['‣', ['u', 'person']]]]]
    const result = await hydrateSummaryMentions(index, map, async () => { assert.fail('no blocks needed') }, undefined, async ids => {
        assert.deepEqual(ids, ['person'])
        return { person: { value: { id: 'person', name: 'Example User' } } } as unknown as ExtendedRecordMap['notion_user']
    })
    assert.equal(result.entries[0].summary, 'Example UserExample User')
    assert.equal(map.notion_user, undefined)
})

test('existing records including explicit denial do not trigger requests', async () => {
    const { map, index } = fixture(['denied'])
    map.block.denied = { value: { role: 'none' } } as unknown as ExtendedRecordMap['block'][string]
    assert.equal(await hydrateSummaryMentions(index, map, async () => { assert.fail('unnecessary request') }), index)
})

test('network failures and incomplete responses reject instead of publishing degraded summaries', async () => {
    const { map, index } = fixture()
    await assert.rejects(hydrateSummaryMentions(index, map, async () => { throw new Error('network') }), /network/)
    await assert.rejects(hydrateSummaryMentions(index, map, async () => ({})), /Incomplete/)
    const result = await hydrateSummaryMentions(index, map, async () => ({ missing: { value: { role: 'none' } } }) as unknown as ExtendedRecordMap['block'])
    assert.equal(result.entries[0].summary, '链接链接')
})

test('large sets use bounded batches without duplicate requests', async () => {
    const ids = Array.from({ length: 205 }, (_, i) => `id-${i}`)
    const { map, index } = fixture(ids)
    const sizes: number[] = []
    await hydrateSummaryMentions(index, map, async batch => {
        sizes.push(batch.length)
        return Object.fromEntries(batch.map(id => [id, { value: { role: 'none' } }])) as unknown as ExtendedRecordMap['block']
    })
    assert.deepEqual(sizes, [100, 100, 5])
})
