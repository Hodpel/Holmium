import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NotionRenderer } from 'react-notion-x'
import { getBlockValue } from 'notion-utils'
import type { Decoration, ExtendedRecordMap } from 'notion-types'
import { normalizeRenderBlocks, UNAVAILABLE_LINK_MARKER } from './normalizeRenderBlocks.ts'

test('denied external mentions use the static-mention marker without changing cached data', () => {
    for (const denied of [{ role: 'none' }, { value: { role: 'none' } }]) {
        const source = fixture()
        source.block.denied = denied as unknown as ExtendedRecordMap['block'][string]
        const block = getBlockValue(source.block.text)!
        block.properties = { title: [['Before '], ['‣', [['eoi', 'denied'], ['b']]], [' after']] } as typeof block.properties
        const fixed = normalizeRenderBlocks(source)
        assert.deepEqual(getBlockValue(fixed.block.text)!.properties!.title[1], ['链接失效', [['a', UNAVAILABLE_LINK_MARKER]]])
        assert.equal(block.properties!.title[1][0], '‣')
        assert.equal(normalizeRenderBlocks(fixed), fixed)
    }
})

test('web mentions are routed through the local renderer without mutating source metadata', () => {
    const source = fixture()
    const metadata = { href: 'https://example.com', title: 'Example' }
    const block = getBlockValue(source.block.quote)!
    block.properties = { title: [['‣', [['lm', metadata]]]] } as never
    const fixed = normalizeRenderBlocks(source)
    const segment = getBlockValue(fixed.block.quote)!.properties!.title[0]
    assert.equal(segment[0], 'Example')
    assert.equal(segment[1]?.[0][0], 'a')
    assert.equal(block.properties!.title[0][0], '‣')
    assert.equal(normalizeRenderBlocks(fixed), fixed)
})

test('missing external records are not mislabeled as denied and page properties are unchanged', () => {
    const source = fixture()
    getBlockValue(source.block.quote)!.properties = { title: [['Quote']] }
    const title = [['‣', [['eoi', 'missing']]]]
    getBlockValue(source.block.text)!.properties = { title } as never
    getBlockValue(source.block.root)!.properties = { title: [['Root']], summary: title } as never
    assert.equal(normalizeRenderBlocks(source), source)
})

function fixture(nested = false): ExtendedRecordMap {
    const quote = { id: 'quote', type: 'quote', parent_id: 'root', content: ['child', 'text'] }
    return {
        block: {
            root: { role: 'reader', value: { id: 'root', type: 'page', content: ['quote'], properties: { title: [['Root']] } } },
            quote: { role: 'reader', value: nested ? { role: 'reader', value: quote } : quote },
            child: { role: 'reader', value: { id: 'child', type: 'page', parent_id: 'quote', properties: { title: [['Child page']] } } },
            text: { role: 'reader', value: { id: 'text', type: 'text', parent_id: 'quote', properties: { title: [['Nested text']] } } },
        }, collection: {}, collection_view: {}, collection_query: {}, signed_urls: {}, notion_user: {},
    } as unknown as ExtendedRecordMap
}

function statusFixture(nested = false): ExtendedRecordMap {
    const source = fixture(nested)
    getBlockValue(source.block.quote)!.properties = { title: [['Quote']] }
    const row = {
        id: 'row', type: 'page', parent_id: 'records', parent_table: 'collection',
        properties: { title: [['Example record']] },
    }
    source.block.row = { role: 'reader', value: nested ? { role: 'reader', value: row } : row } as never
    source.collection.records = {
        role: 'reader', value: {
            id: 'records', schema: {
                status: { type: 'status', defaultOption: 'Pending', options: [{ value: 'Active' }, { value: 'Pending' }] },
                select: { type: 'select', defaultOption: 'Pending', options: [{ value: 'Pending' }] },
            },
        },
    } as never
    return source
}

test('fills omitted status from the collection default without mutating source or wrappers', () => {
    for (const nested of [false, true]) {
        const source = statusFixture(nested)
        const before = structuredClone(source)
        const fixed = normalizeRenderBlocks(source)
        assert.deepEqual(getBlockValue(fixed.block.row)!.properties, { title: [['Example record']], status: [['Pending']] })
        assert.deepEqual(source, before)
        assert.equal(fixed.collection, source.collection)
        assert.equal(fixed.block.row.role, 'reader')
        assert.equal('value' in fixed.block.row.value, nested)
        assert.equal(normalizeRenderBlocks(fixed), fixed)
    }
})

test('does not overwrite explicit status values including explicitly empty data', () => {
    for (const value of [[['Active']], [], [['']]]) {
        const source = statusFixture()
        getBlockValue(source.block.row)!.properties!.status = value as Decoration[]
        assert.equal(normalizeRenderBlocks(source), source)
    }
})

test('does not invent a status when the default is missing or not a configured option', () => {
    for (const defaultOption of [undefined, '', 'removed']) {
        const source = statusFixture()
        const schema = getBlockValue(source.collection.records)!.schema.status as { defaultOption?: string }
        schema.defaultOption = defaultOption
        assert.equal(normalizeRenderBlocks(source), source)
    }
})

test('only normalizes database rows belonging to a known collection', () => {
    for (const parent of [{ parent_table: 'block', parent_id: 'records' }, { parent_table: 'collection', parent_id: 'missing' }]) {
        const source = statusFixture()
        Object.assign(getBlockValue(source.block.row)!, parent)
        assert.equal(normalizeRenderBlocks(source), source)
    }
})

test('renders nested content after normalizing a titleless quote', () => {
    const source = fixture()
    const before = renderToStaticMarkup(createElement(NotionRenderer, { recordMap: source, fullPage: false }))
    assert.ok(!before.includes('Nested text'))
    const fixed = normalizeRenderBlocks(source)
    const html = renderToStaticMarkup(createElement(NotionRenderer, { recordMap: fixed, fullPage: false }))
    assert.ok(html.includes('Child page'))
    assert.ok(html.includes('Nested text'))
    assert.ok(html.includes('notion-quote'))
    assert.equal(getBlockValue(source.block.quote)?.properties, undefined)
    assert.equal(fixed.block.child, source.block.child)
    assert.equal(getBlockValue(fixed.block.quote)?.content, getBlockValue(source.block.quote)?.content)
})

test('supports nested record wrappers and is idempotent', () => {
    const fixed = normalizeRenderBlocks(fixture(true))
    assert.deepEqual(getBlockValue(fixed.block.quote)?.properties, { title: [] })
    assert.equal(normalizeRenderBlocks(fixed), fixed)
})

test('preserves ordinary quotes and completely empty quotes', () => {
    const source = fixture()
    const quote = getBlockValue(source.block.quote)!
    quote.properties = { title: [['Normal quote']] }
    assert.equal(normalizeRenderBlocks(source), source)
    delete quote.properties
    delete quote.content
    assert.equal(normalizeRenderBlocks(source), source)
})

test('renders a gray fallback for unnamed child pages without changing the source', () => {
    for (const title of [undefined, [], [['']], [['   ']]]) {
        const source = fixture()
        const child = getBlockValue(source.block.child)!
        child.parent_table = 'block'
        child.properties = title ? { title } as typeof child.properties : undefined
        const fixed = normalizeRenderBlocks(source)
        const html = renderToStaticMarkup(createElement(NotionRenderer, { recordMap: fixed, fullPage: false }))
        assert.match(html, /class="notion-gray"[^>]*>未命名/)
        assert.equal(child.properties?.title, title)
        assert.equal(getBlockValue(fixed.block.child)?.id, child.id)
    }
})

test('marks adjacent background runs independently of their other text formatting', () => {
    const source = fixture()
    const title = [
        ['灰色', [['h', 'gray_background']]],
        ['蓝色', [['b'], ['h', 'blue_background']]],
        ['紫色', [['h', 'purple_background'], ['i'], ['s']]],
        ['普通'],
        ['红色', [['h', 'red_background']]],
    ]
    getBlockValue(source.block.text)!.properties = { title } as never

    const fixed = normalizeRenderBlocks(source)
    const normalizedTitle = getBlockValue(fixed.block.text)!.properties!.title
    assert.deepEqual(normalizedTitle.map((segment: Decoration) => segment[1]?.at(-1)), [
        ['h', 'holmium-highlight-start'],
        ['h', 'holmium-highlight-middle'],
        ['h', 'holmium-highlight-end'],
        undefined,
        ['h', 'red_background'],
    ])
    assert.deepEqual(getBlockValue(source.block.text)!.properties!.title, title)
    assert.equal(normalizeRenderBlocks(fixed), fixed)

    const html = renderToStaticMarkup(createElement(NotionRenderer, { recordMap: fixed, fullPage: false }))
    assert.match(html, /notion-holmium-highlight-start[^>]*>.*notion-gray_background/)
    assert.match(html, /notion-holmium-highlight-middle[^>]*>.*notion-blue_background/)
    assert.match(html, /notion-holmium-highlight-end[^>]*>.*notion-purple_background/)
})
