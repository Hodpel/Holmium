import assert from 'node:assert/strict'
import test from 'node:test'

import type { ExtendedRecordMap, FormattedDate } from 'notion-types'
import { getBlockValue } from 'notion-utils'

import { formatNotionDate, localizeRecordMapDates } from './localizeDates.ts'

test('relative mentions retain a date-only tooltip while preserving emphasis', () => {
    const map = { block: { text: { value: { id: 'text', type: 'text', properties: { title: [['‣', [['b'], ['d', {
        type: 'datetimerange', start_date: '2026-09-12', end_date: '2026-09-13', start_time: '16:00', end_time: '18:00', date_format: 'relative',
    }]]]] } } } } } as unknown as ExtendedRecordMap
    const result = localizeRecordMapDates(map, 'zh-CN', { now: new Date('2026-09-12T10:00:00Z') })
    const title = getBlockValue(result.block.text)!.properties!.title
    assert.equal(title[0][0], '今天 16:00 → 明天 18:00')
    assert.deepEqual(title[0][1], [['b'], ['a', `holmium-date:${encodeURIComponent('2026年9月12日 → 2026年9月13日')}`]])
    assert.equal(getBlockValue(map.block.text)!.properties!.title[0][0], '‣')
})

test('localizes date mentions across ordinary blocks and collection rows without mutating the source', () => {
    const date = ['d', { type: 'datetime', start_date: '2026-09-07', start_time: '10:00' }]
    const recordMap = {
        block: {
            toggle: {
                role: 'reader',
                value: {
                    id: 'toggle',
                    type: 'toggle',
                    properties: { title: [['‣', [date, ['b']]]] },
                },
            },
            row: {
                role: 'reader',
                value: {
                    id: 'row',
                    type: 'page',
                    properties: { date: [['‣', [date]]] },
                },
            },
        },
    } as unknown as ExtendedRecordMap

    const localized = localizeRecordMapDates(recordMap, 'zh-CN')
    const localizedToggle = getBlockValue(localized.block.toggle)
    const localizedRow = getBlockValue(localized.block.row)
    const sourceToggle = getBlockValue(recordMap.block.toggle)

    assert.deepEqual(localizedToggle?.properties?.title, [['2026年9月7日 10:00', [['b'], ['a', 'holmium-date:']]]])
    assert.deepEqual(localizedRow?.properties?.date, [['2026年9月7日 10:00']])
    assert.equal(sourceToggle?.properties?.title?.[0]?.[0], '‣')
})

test('reuses the original record map when it contains no date mentions', () => {
    const recordMap = {
        block: {
            text: {
                role: 'reader',
                value: {
                    id: 'text',
                    type: 'text',
                    properties: { title: [['正文']] },
                },
            },
        },
    } as unknown as ExtendedRecordMap

    assert.equal(localizeRecordMapDates(recordMap, 'zh-CN'), recordMap)
})

test('collection settings supply missing formats while an explicit cell setting wins', () => {
    const map = { collection: { db: { value: { id: 'db', schema: { date: { type: 'date', date_format: 'DD/MM/YYYY' } } } } }, block: {
        row: { value: { id: 'row', type: 'page', parent_table: 'collection', parent_id: 'db', properties: {
            date: [['‣', [['d', { type: 'date', start_date: '2026-09-12' }]]]],
        } } },
    } } as unknown as ExtendedRecordMap
    const localized = localizeRecordMapDates(map, 'zh-CN')
    assert.deepEqual(getBlockValue(localized.block.row)!.properties, { date: [['12/09/2026']] })
    getBlockValue(map.block.row)!.properties = { title: [], date: [['‣', [['d', { type: 'date', start_date: '2026-09-12', date_format: 'YYYY/MM/DD' }]]]] } as never
    assert.deepEqual(getBlockValue(localizeRecordMapDates(map, 'zh-CN').block.row)!.properties, { title: [], date: [['2026/09/12']] })
})

test('formats both ends of a Notion date range', () => {
    const value = {
        type: 'datetimerange',
        start_date: '2026-09-07',
        start_time: '10:00',
        end_date: '2026-09-08',
        end_time: '18:30',
    } satisfies FormattedDate

    assert.equal(formatNotionDate(value, 'zh-CN'), '2026年9月7日 10:00 → 2026年9月8日 18:30')
})
