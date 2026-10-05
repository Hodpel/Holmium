import assert from 'node:assert/strict'
import test from 'node:test'
import { formatPublicationDate } from './publicationDate.ts'

test('omits the year for publications in the current site year', () => {
    assert.deepEqual(formatPublicationDate(
        new Date('2026-09-14T00:00:00Z'),
        new Date('2026-09-21T00:00:00Z'),
        'zh-CN',
        'Asia/Shanghai',
    ), {
        display: '9月14日',
        full: '2026年9月14日',
    })
})

test('keeps the year for older publications', () => {
    assert.deepEqual(formatPublicationDate(
        new Date('2025-09-14T00:00:00Z'),
        new Date('2026-09-21T00:00:00Z'),
        'en-US',
        'Asia/Shanghai',
    ), {
        display: 'Sep 14, 2025',
        full: 'Sep 14, 2025',
    })
})

test('compares years in the configured timezone', () => {
    assert.equal(formatPublicationDate(
        new Date('2025-12-31T16:30:00Z'),
        new Date('2026-01-01T00:30:00Z'),
        'zh-CN',
        'Asia/Shanghai',
    ).display, '1月1日')
})
