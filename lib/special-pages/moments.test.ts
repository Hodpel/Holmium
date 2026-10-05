import assert from 'node:assert/strict'
import test from 'node:test'
import type { Block, ExtendedRecordMap } from 'notion-types'

import { parseMomentsDocument } from './moments.ts'

const PAGE_ID = '11111111-1111-4111-8111-111111111111'

type FixtureBlock = Block & { created_time?: number; last_edited_time?: number }

function text(id: string, value = '', decorations?: unknown, lastEdited = 0): FixtureBlock {
    return {
        id,
        type: 'text',
        parent_id: PAGE_ID,
        parent_table: 'block',
        properties: { title: [[value, decorations].filter((part) => part !== undefined)] },
        last_edited_time: lastEdited,
    } as unknown as FixtureBlock
}

function divider(id: string, createdTime: number): FixtureBlock {
    return { id, type: 'divider', parent_id: PAGE_ID, parent_table: 'block', created_time: createdTime } as FixtureBlock
}

function fixture(blocks: readonly FixtureBlock[]): ExtendedRecordMap {
    const root = { id: PAGE_ID, type: 'page', content: blocks.map((block) => block.id), properties: { title: [['Moments']] } }
    return {
        block: Object.fromEntries([root, ...blocks].map((block) => [block.id, { role: 'reader', value: block }])),
        collection: {}, collection_view: {}, notion_user: {}, collection_query: {}, signed_urls: {},
    } as unknown as ExtendedRecordMap
}

const dateDecoration = (startDate: string) => [['d', { type: 'date', start_date: startDate }]]

test('splits top-level Divider sections and skips empty sections', () => {
    const result = parseMomentsDocument(fixture([
        text('intro', '页面介绍'),
        divider('m1', Date.UTC(2026, 1, 26)),
        text('body-1', '第一段'),
        text('body-2', '第二段'),
        divider('empty', Date.UTC(2026, 1, 27)),
    ]), PAGE_ID, 'zh-CN', 'Asia/Shanghai')

    assert.deepEqual(result.introBlockIds, ['intro'])
    assert.deepEqual(result.years[0]?.months[0]?.moments[0]?.blockIds, ['body-1', 'body-2'])
    assert.equal(result.years[0]?.momentCount, 1)
})

test('consumes only a pure leading date mention and ignores preceding blank metadata blocks', () => {
    const result = parseMomentsDocument(fixture([
        divider('moment', Date.UTC(2026, 0, 1)),
        text('blank', '   '),
        text('date', '2024年1月15日', dateDecoration('2024-01-15')),
        text('body', '正文', undefined, Date.UTC(2030, 0, 1)),
    ]), PAGE_ID, 'zh-CN', 'Asia/Shanghai')
    const moment = result.years[0]?.months[0]?.moments[0]

    assert.equal(new Date(moment!.publishedAt).toISOString(), '2024-01-14T16:00:00.000Z')
    assert.deepEqual(moment?.blockIds, ['body'])
})

test('recognizes the Notion date placeholder with its trailing whitespace segment', () => {
    const metadata = text('date', '')
    metadata.properties = { title: [['‣', dateDecoration('2026-02-26')], [' ']] } as never
    const result = parseMomentsDocument(fixture([
        divider('moment', Date.UTC(2026, 8, 21)), metadata, text('body', '正文'),
    ]), PAGE_ID, 'zh-CN', 'Asia/Shanghai')

    assert.equal(result.years[0]?.id, '2026')
    assert.equal(result.years[0]?.months[0]?.key, '02')
    assert.deepEqual(result.years[0]?.months[0]?.moments[0]?.blockIds, ['body'])
})

test('keeps mixed date text visible and falls back to the Divider creation time', () => {
    const created = Date.UTC(2026, 0, 2)
    const result = parseMomentsDocument(fixture([
        divider('moment', created),
        text('mixed', '写于 ', undefined),
        text('date', '2024年1月15日', dateDecoration('2024-01-15')),
    ]), PAGE_ID, 'zh-CN', 'UTC')
    const moment = result.years[0]?.months[0]?.moments[0]

    assert.equal(moment?.publishedAt, created)
    assert.deepEqual(moment?.blockIds, ['mixed', 'date'])
})

test('hides malformed pure date metadata but uses the Divider creation time', () => {
    const created = Date.UTC(2026, 0, 2)
    const result = parseMomentsDocument(fixture([
        divider('moment', created),
        text('bad-date', '错误日期', dateDecoration('2022-02-30')),
        text('body', '正文'),
    ]), PAGE_ID, 'zh-CN', 'UTC')
    const moment = result.years[0]?.months[0]?.moments[0]

    assert.equal(moment?.publishedAt, created)
    assert.deepEqual(moment?.blockIds, ['body'])
})

test('groups in the configured timezone, sorts newest first, and preserves source order on ties', () => {
    const boundary = Date.parse('2025-12-31T16:30:00.000Z')
    const result = parseMomentsDocument(fixture([
        divider('first', boundary), text('first-body', '第一条'),
        divider('second', boundary), text('second-body', '第二条'),
        divider('older', Date.parse('2025-08-01T00:00:00.000Z')), text('older-body', '旧内容'),
    ]), PAGE_ID, 'zh-CN', 'Asia/Shanghai')

    assert.deepEqual(result.years.map((year) => year.id), ['2026', '2025'])
    assert.equal(result.years[0]?.months[0]?.label, '一月')
    assert.equal(result.years[0]?.momentCount, 2)
    assert.deepEqual(result.years[0]?.months[0]?.moments.map((moment) => moment.id), ['first', 'second'])
})
