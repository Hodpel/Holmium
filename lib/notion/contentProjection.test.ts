import assert from 'node:assert/strict'
import test from 'node:test'
import type { ExtendedRecordMap } from 'notion-types'
import { getBlockValue } from 'notion-utils'

import { projectPageContent } from './contentProjection.ts'

function fixture(): ExtendedRecordMap {
    const blocks = [
        { id: 'root', type: 'page', content: ['one', 'two'], properties: { title: [['Page']] } },
        { id: 'one', type: 'text', parent_id: 'root', properties: { title: [['One']] } },
        { id: 'two', type: 'text', parent_id: 'root', properties: { title: [['Two']] } },
    ]
    return {
        block: Object.fromEntries(blocks.map((block) => [block.id, { role: 'reader', value: block }])),
        collection: {}, collection_view: {}, notion_user: {}, collection_query: {}, signed_urls: {},
    } as unknown as ExtendedRecordMap
}

test('projects independent immutable aliases without changing the source page', () => {
    const source = fixture()
    const first = projectPageContent(source, 'root', ['one'], 'intro')
    const second = projectPageContent(source, 'root', ['two'], 'moment-two')

    assert.equal(first.blockId, 'holmium-fragment:intro')
    assert.deepEqual(getBlockValue(first.recordMap.block[first.blockId])?.content, ['one'])
    assert.deepEqual(getBlockValue(second.recordMap.block[second.blockId])?.content, ['two'])
    assert.deepEqual(getBlockValue(source.block.root)?.content, ['one', 'two'])
    assert.notEqual(getBlockValue(first.recordMap.block[first.blockId])?.content, getBlockValue(second.recordMap.block[second.blockId])?.content)
})

test('throws a descriptive error when the requested page root is absent', () => {
    assert.throws(
        () => projectPageContent(fixture(), 'missing-page', [], 'empty'),
        (error: unknown) => error instanceof Error && error.message.includes('missing-page'),
    )
})
