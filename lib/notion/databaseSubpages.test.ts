import assert from 'node:assert/strict'
import test from 'node:test'
import type { ExtendedRecordMap } from 'notion-types'
import { getBlockValue } from 'notion-utils'
import { collectSubpages, isAuthorizedSubpage, projectSubpageCallouts } from './subpages.ts'

function fixture() {
    return { block: {
        root: { value: { id: 'root', type: 'page', content: ['db'] } },
        db: { value: { id: 'db', type: 'collection_view', parent_table: 'block', parent_id: 'root', collection_id: 'collection' } },
        row: { value: { id: 'row', type: 'page', parent_table: 'collection', parent_id: 'collection', properties: { flag: [['Yes']], title: [['Row']] } } },
    }, collection: { collection: { value: { id: 'collection', parent_table: 'block', parent_id: 'db', schema: { flag: { name: 'isSub', type: 'checkbox' }, title: { name: 'Name', type: 'title' } } } } } } as unknown as ExtendedRecordMap
}

test('only checked records in a physically owned database become subpages', () => {
    const map = fixture()
    assert.deepEqual(collectSubpages(map, 'root').map(page => page.id), ['row'])
    for (const mutate of [
        (m: ReturnType<typeof fixture>) => { getBlockValue(m.collection.collection)!.parent_id = 'external' },
        (m: ReturnType<typeof fixture>) => { getBlockValue(m.collection.collection)!.schema.flag.type = 'text' },
        (m: ReturnType<typeof fixture>) => { getBlockValue(m.collection.collection)!.schema.flag.name = 'sub' },
        (m: ReturnType<typeof fixture>) => { getBlockValue(m.block.row)!.properties = { title: [['Row']] } },
        (m: ReturnType<typeof fixture>) => { getBlockValue(m.block.row)!.parent_id = 'foreign' },
        (m: ReturnType<typeof fixture>) => { getBlockValue(m.block.row)!.alive = false },
    ]) {
        const changed = fixture()
        mutate(changed)
        assert.deepEqual(collectSubpages(changed, 'root'), [])
    }
})

test('database discovery preserves its wrapper and rechecks the selected record checkbox', () => {
    const map = fixture()
    const pages = collectSubpages(map, 'root')
    assert.equal(projectSubpageCallouts(map, pages), map)
    assert.equal(getBlockValue(map.collection.collection)!.schema.flag.name, 'isSub')
    assert.deepEqual(collectSubpages(map, 'root'), pages)
    assert.equal(isAuthorizedSubpage(getBlockValue(map.block.row), pages[0], map), true)
    getBlockValue(map.block.row)!.properties = { title: [['Row']] }
    assert.equal(isAuthorizedSubpage(getBlockValue(map.block.row), pages[0], map), false)
})
