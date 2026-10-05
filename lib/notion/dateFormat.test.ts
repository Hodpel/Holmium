import assert from 'node:assert/strict'
import test from 'node:test'
import { formatNotionDate } from './dateFormat.ts'

const context = { now: new Date('2026-09-12T10:00:00Z'), timeZone: 'Asia/Shanghai' }
test('relative dates prioritize adjacent days, then Monday-based previous/current/next weeks', () => {
    for (const [date, label] of [['2026-08-30', '2026年8月30日'], ['2026-08-31', '上周一'], ['2026-09-07', '周一'], ['2026-09-11', '昨天'], ['2026-09-12', '今天'], ['2026-09-13', '明天'], ['2026-09-16', '下周三'], ['2026-09-20', '下周日'], ['2026-09-21', '2026年9月21日']]) {
        assert.equal(formatNotionDate({ type: 'date', start_date: date, date_format: 'relative' }, 'zh-CN', context), label)
    }
})
test('explicit formats and ranges respect Notion settings', () => {
    for (const [format, label] of [['ll', '2026年9月12日'], ['MM/DD/YYYY', '09/12/2026'], ['DD/MM/YYYY', '12/09/2026'], ['YYYY/MM/DD', '2026/09/12'], ['MMM d', '9.12']]) {
        assert.equal(formatNotionDate({ type: 'date', start_date: '2026-09-12', date_format: format }, 'zh-CN', context), label)
    }
    assert.equal(formatNotionDate({ type: 'datetimerange', start_date: '2026-09-12', end_date: '2026-09-12', start_time: '16:00', end_time: '18:00', date_format: 'relative', time_format: 'H:mm' }, 'zh-CN', context), '今天 16:00 → 18:00')
})

test('Notion full and short menu formats localize month names in English', () => {
    assert.equal(formatNotionDate({ type: 'date', start_date: '2026-09-12', date_format: 'll' }, 'en-US'), 'Sep 12, 2026')
    assert.equal(formatNotionDate({ type: 'date', start_date: '2026-09-12', date_format: 'MMM d' }, 'en-US'), 'Sep 12')
})
test('today uses the date timezone without shifting stored wall-clock times', () => {
    const value = { type: 'datetime' as const, start_date: '2026-09-12', start_time: '18:00', date_format: 'relative', time_format: 'H:mm', time_zone: 'America/Los_Angeles' }
    assert.equal(formatNotionDate(value, 'zh-CN', { ...context, now: new Date('2026-09-12T01:00:00Z') }), '明天 18:00')
    assert.equal(formatNotionDate({ ...value, time_format: 'h:mm A' }, 'en-US', context), 'today 6:00 PM')
    assert.equal(formatNotionDate({ type: 'date', start_date: '2026-02-30' }, 'zh-CN'), null)
})
