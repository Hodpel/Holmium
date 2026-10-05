import assert from 'node:assert/strict'
import test from 'node:test'

import type { BlogEntrySummary } from '../blog/types'
import { archiveTableOfContents, buildArchiveYears } from './archive.ts'

function entry(id: string, publishedAt: string, overrides: Partial<BlogEntrySummary> = {}): BlogEntrySummary {
    return {
        id,
        slug: id,
        title: id,
        kind: 'post',
        publishedAt,
        summary: null,
        tags: [],
        icon: null,
        fullWidth: false,
        ...overrides,
    }
}

test('sorts posts newest first and groups them by localized year and month', () => {
    const years = buildArchiveYears(
        [
            entry('older', '2025-12-10T00:00:00.000Z'),
            entry('newer', '2026-02-03T00:00:00.000Z', { icon: { kind: 'emoji', value: '🥳' } }),
        ],
        'zh-CN',
        'UTC',
    )

    assert.deepEqual(years.map((year) => year.id), ['2026', '2025'])
    assert.equal(years[0]?.months[0]?.label, '二月')
    assert.deepEqual(years[0]?.months[0]?.posts[0], {
        id: 'newer', slug: 'newer', title: 'newer', day: '3日', dateTime: '2026-02-03T00:00:00.000Z',
        icon: { kind: 'emoji', value: '🥳' },
    })
})

test('uses the configured timezone at year and month boundaries', () => {
    const years = buildArchiveYears([entry('boundary', '2025-12-31T16:30:00.000Z')], 'zh-CN', 'Asia/Shanghai')

    assert.equal(years[0]?.id, '2026')
    assert.equal(years[0]?.months[0]?.label, '一月')
    assert.equal(years[0]?.months[0]?.posts[0]?.day, '1日')
})

test('localizes the complete day label instead of appending a fixed suffix', () => {
    const publishedAt = '2026-02-03T00:00:00.000Z'

    assert.equal(buildArchiveYears([entry('en', publishedAt)], 'en-US', 'UTC')[0]?.months[0]?.posts[0]?.day, '3')
})

test('preserves source order when publication timestamps are equal', () => {
    const years = buildArchiveYears(
        [entry('first', '2026-01-01T00:00:00.000Z'), entry('second', '2026-01-01T00:00:00.000Z')],
        'en-US',
        'UTC',
    )

    assert.deepEqual(years[0]?.months[0]?.posts.map((post) => post.id), ['first', 'second'])
})

test('filters pages and entries with invalid dates', () => {
    const years = buildArchiveYears(
        [entry('page', '2026-01-01T00:00:00.000Z', { kind: 'page' }), entry('bad', 'invalid')],
        'en-US',
        'UTC',
    )

    assert.deepEqual(years, [])
})

test('only exposes year table-of-contents entries when at least three years exist', () => {
    const year = (id: string) => ({ id, months: [] })
    assert.deepEqual(archiveTableOfContents([year('2026'), year('2025')]), [])
    assert.deepEqual(archiveTableOfContents([year('2026'), year('2025'), year('2024')]), [
        { id: '2026', indentLevel: 0, text: '2026' },
        { id: '2025', indentLevel: 0, text: '2025' },
        { id: '2024', indentLevel: 0, text: '2024' },
    ])
})
