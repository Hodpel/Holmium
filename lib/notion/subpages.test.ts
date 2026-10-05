import assert from 'node:assert/strict'
import test from 'node:test'
import type { Block, ExtendedRecordMap } from 'notion-types'
import { getBlockValue } from 'notion-utils'
import { collectSubpages, projectSubpageCallouts } from './subpages.ts'
import { resolveSubpageAccess } from '../blog/subpageAccess.ts'
import type { BlogIndex } from '../blog/types.ts'

export const rootId = '11111111-1111-4111-8111-111111111111'
export const calloutId = '22222222-2222-4222-8222-222222222222'
export const childId = '33333333-3333-4333-8333-333333333333'
export function fixture(): ExtendedRecordMap {
    const blocks = [
        { id: rootId, type: 'page', alive: true, content: [calloutId] },
        { id: calloutId, type: 'callout', alive: true, parent_table: 'block', parent_id: rootId, content: [childId], format: { block_color: 'default_background', callout_version: 2 } },
        { id: childId, type: 'page', alive: true, parent_table: 'block', parent_id: calloutId, properties: { title: [['Child']] }, version: 2, last_edited_time: 123 },
    ]
    return { block: Object.fromEntries(blocks.map(value => [value.id, { role: 'reader', value }])), collection: {}, collection_view: {}, collection_query: {}, notion_user: {}, signed_urls: {} } as unknown as ExtendedRecordMap
}

test('discovers a default-style callout and projects its links without mutating the cached tree', () => {
    const map = fixture()
    const entries = collectSubpages(map, rootId)
    assert.deepEqual(entries, [{ id: childId, calloutId, revision: '2:123' }])
    const projected = projectSubpageCallouts(map, entries)
    assert.deepEqual(getBlockValue(projected.block[rootId])?.content, [childId])
    assert.deepEqual(getBlockValue(map.block[rootId])?.content, [calloutId])
    assert.equal(projected.block[childId], map.block[childId])
    assert.equal(projected.block[calloutId], map.block[calloutId])
    assert.equal(projectSubpageCallouts(map, []), map)
})

test('rejects text, icons, colors, empty or mixed containers and missing, deleted or foreign pages', () => {
    const mutations: ((map: ExtendedRecordMap) => void)[] = [
        map => { getBlockValue(map.block[calloutId])!.properties = { title: [['Note']] } },
        map => { Object.assign(getBlockValue(map.block[calloutId])!.format!, { page_icon: '💡' }) },
        map => { Object.assign(getBlockValue(map.block[calloutId])!.format!, { block_color: 'blue_background' }) },
        map => { getBlockValue(map.block[calloutId])!.content = [] },
        map => { getBlockValue(map.block[calloutId])!.content!.push('missing') },
        map => { delete map.block[childId] },
        map => { getBlockValue(map.block[childId])!.alive = false },
        map => { getBlockValue(map.block[calloutId])!.alive = false },
        map => { getBlockValue(map.block[childId])!.parent_id = rootId },
        map => { getBlockValue(map.block[childId])!.parent_table = 'collection' },
        map => { getBlockValue(map.block[calloutId])!.parent_id = childId },
        map => { map.block[childId].value = { ...getBlockValue(map.block[childId]), type: 'text' } as Block },
    ]
    for (const mutate of mutations) {
        const map = fixture()
        mutate(map)
        assert.deepEqual(collectSubpages(map, rootId), [])
    }
})

test('only traverses owned content and stops at page, database and synced-block boundaries', () => {
    for (const type of ['page', 'collection_view', 'transclusion_container']) {
        const map = fixture()
        const middle = '44444444-4444-4444-8444-444444444444'
        getBlockValue(map.block[rootId])!.content = [middle]
        getBlockValue(map.block[calloutId])!.parent_id = middle
        map.block[middle] = { role: 'reader', value: { id: middle, type, parent_id: rootId, parent_table: 'block', content: [calloutId] } as Block }
        assert.deepEqual(collectSubpages(map, rootId), [])
    }
    const map = fixture()
    getBlockValue(map.block[rootId])!.content = []
    assert.deepEqual(collectSubpages(map, rootId), [])
})

test('recognizes owned callouts in ordinary containers and handles nested record wrappers', () => {
    const map = fixture()
    const middle = '44444444-4444-4444-8444-444444444444'
    getBlockValue(map.block[rootId])!.content = [middle]
    getBlockValue(map.block[calloutId])!.parent_id = middle
    map.block[middle] = { role: 'reader', value: { id: middle, type: 'toggle', parent_id: rootId, parent_table: 'block', content: [calloutId] } as Block }
    const record = map.block[middle]
    map.block[middle] = { role: 'reader', value: record } as unknown as typeof record
    const entries = collectSubpages(map, rootId)
    assert.equal(entries.length, 1)
    assert.deepEqual(getBlockValue(projectSubpageCallouts(map, entries).block[middle])?.content, [childId])
})

function index(): BlogIndex {
    return { rootPageId: 'blog', contentRevisions: { [rootId]: 'parent-revision' }, entries: [
        { id: rootId, title: 'Parent', slug: 'parent', kind: 'post', publishedAt: '2026-09-01', tags: [], summary: null, icon: null, fullWidth: false },
    ] }
}

test('authorizes from the published parent before loading only the selected child', async () => {
    const map = fixture()
    const calls: string[] = []
    const result = await resolveSubpageAccess(rootId, childId, index(), async id => { calls.push(id); return map })
    assert.ok(result)
    assert.deepEqual(calls, [rootId, childId])
    assert.equal(result.recordMap, map)
})

test('does not fetch unpublished parents or unauthorized child bodies', async () => {
    const calls: string[] = []
    const load = async (id: string) => { calls.push(id); return fixture() }
    assert.equal(await resolveSubpageAccess(rootId, childId, { ...index(), entries: [] }, load), null)
    assert.deepEqual(calls, [])
    assert.equal(await resolveSubpageAccess(rootId, 'foreign', index(), load), null)
    assert.deepEqual(calls, [rootId])
})

test('rejects a deleted or moved child even when the parent snapshot still lists it', async () => {
    for (const deleted of [true, false]) {
        const parent = fixture(), child = fixture()
        if (deleted) getBlockValue(child.block[childId])!.alive = false
        else getBlockValue(child.block[childId])!.parent_id = rootId
        assert.equal(await resolveSubpageAccess(rootId, childId, index(), async id => id === rootId ? parent : child), null)
    }
})
