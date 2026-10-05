import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NotionRenderer } from 'react-notion-x'
import { getBlockValue } from 'notion-utils'
import type { Block, ExtendedRecordMap } from 'notion-types'
import { planRenderBatches, projectRenderBatch } from './renderBatches.ts'

function fixture(count: number): ExtendedRecordMap {
    const blocks = Array.from({ length: count }, (_, i) => ({
        id: `item${i}`, type: 'text', parent_id: 'root', parent_table: 'block',
        properties: { title: [[`Paragraph ${i}`]] },
    }))
    return {
        block: Object.fromEntries([{ id: 'root', type: 'page', content: blocks.map(b => b.id), properties: { title: [['Page']] } }, ...blocks]
            .map(block => [block.id, { role: 'reader', value: block }])),
        collection: {}, collection_view: {}, notion_user: {}, collection_query: {}, signed_urls: {},
    } as unknown as ExtendedRecordMap
}

test('short pages remain complete; long pages advance monotonically without losing blocks', () => {
    assert.deepEqual(planRenderBatches(fixture(3)).ends, [3])
    const plan = planRenderBatches(fixture(150))
    assert.ok(plan.ends.length > 1)
    assert.ok(plan.ends[0] > 0 && plan.ends[0] < 150)
    assert.equal(plan.ends.at(-1), 150)
    assert.ok(plan.ends.every((end, i) => i === 0 || end > plan.ends[i - 1]))
})

test('nested blocks stay atomic and hash targets resolve to the containing batch', () => {
    const map = fixture(150)
    const parent = getBlockValue(map.block.item0)!
    parent.content = ['nested']
    map.block.nested = { role: 'reader', value: { id: 'nested', type: 'header', parent_id: 'item0', properties: { title: [['Nested']] } } as Block }
    const plan = planRenderBatches(map)
    assert.equal(plan.targetEnds.get('nested'), plan.ends[0])
    assert.equal(plan.targetEnds.get('item149'), 150)
    const view = projectRenderBatch(map, plan, plan.ends[0])
    assert.equal(view.recordMap.block.nested, map.block.nested)
    assert.equal(view.recordMap.block.item0, map.block.item0)
})

test('projection keeps original parent metadata and all TOC entries, but renders only the prefix', () => {
    const map = fixture(150)
    map.block.item0.value = { id: 'item0', type: 'table_of_contents', parent_id: 'root', parent_table: 'block' } as Block
    map.block.item149.value = { id: 'item149', type: 'header', parent_id: 'root', parent_table: 'block', properties: { title: [['Last heading']] } } as Block
    const plan = planRenderBatches(map)
    const view = projectRenderBatch(map, plan, plan.ends[0])
    assert.equal(view.recordMap.block.root, map.block.root)
    assert.equal(getBlockValue(map.block.root)!.content!.length, 150)
    const html = renderToStaticMarkup(createElement(NotionRenderer, { ...view, fullPage: false, isImageZoomable: false }))
    assert.ok(html.includes('Last heading'), 'embedded TOC must include not-yet-mounted heading')
    assert.ok(!html.includes('Paragraph 148'), 'later body blocks must not mount')
    assert.ok(html.includes('Paragraph 1'))
})

test('nested record wrappers work and rendering identity stays stable at completion', () => {
    const map = fixture(150)
    const original = map.block.root
    map.block.root = { role: 'reader', value: original } as unknown as typeof original
    const plan = planRenderBatches(map)
    const first = projectRenderBatch(map, plan, plan.ends[0])
    const last = projectRenderBatch(map, plan, 150)
    assert.equal(first.blockId, last.blockId)
    assert.equal(getBlockValue(last.recordMap.block[last.blockId])!.content!.length, 150)
    assert.equal(map.block.root.value, original)
})

test('batch boundaries keep a consecutive numbered list together', () => {
    const map = fixture(150)
    for (let i = 25; i < 45; i++) getBlockValue(map.block[`item${i}`])!.type = 'numbered_list'
    const plan = planRenderBatches(map)
    assert.ok(plan.ends.every(end => end <= 25 || end >= 45))
})

test('few top-level blocks with large descendants still qualify for batching', () => {
    const map = fixture(3)
    const parent = getBlockValue(map.block.item0)!
    parent.content = Array.from({ length: 100 }, (_, i) => `child${i}`)
    for (const id of parent.content) map.block[id] = { role: 'reader', value: { id, type: 'text', parent_id: 'item0' } as Block }
    const plan = planRenderBatches(map)
    assert.ok(plan.ends.length > 1)
    assert.equal(plan.targetEnds.get('child99'), plan.targetEnds.get('item0'))
})

test('initial batch provides more reading content than subsequent batches', () => {
    const { ends } = planRenderBatches(fixture(150))
    assert.ok(ends[0] > ends[1] - ends[0])
    assert.ok(ends[0] < 150)
})
