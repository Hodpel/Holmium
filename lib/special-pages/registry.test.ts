import assert from 'node:assert/strict'
import test from 'node:test'

import type { BlogEntrySummary } from '../blog/types'
import { buildSpecialPageRegistry, SpecialPageConfigError } from './registry.ts'

const PAGE_ID = '12345678-1234-1234-1234-123456789abc'

function entry(overrides: Partial<BlogEntrySummary> = {}): BlogEntrySummary {
    return {
        id: PAGE_ID,
        slug: 'archive',
        title: 'Archive',
        kind: 'page',
        publishedAt: '2026-09-21T00:00:00.000Z',
        summary: null,
        tags: [],
        icon: null,
        fullWidth: false,
        ...overrides,
    }
}

test('empty configuration registers no special pages', () => {
    assert.equal(buildSpecialPageRegistry([], [entry()]).size, 0)
})

test('normalizes compact and whitespace-padded page IDs', () => {
    const registry = buildSpecialPageRegistry(
        [{ type: 'archive', pageId: ' 12345678123412341234123456789abc ' }],
        [entry()],
    )

    assert.deepEqual(registry.get(PAGE_ID), { type: 'archive', page: entry() })
})

test('registers archive and moments pages together', () => {
    const momentsId = 'abcdefab-cdef-abcd-efab-cdefabcdefab'
    const moments = entry({ id: momentsId, slug: 'moments', title: 'Moments' })
    const registry = buildSpecialPageRegistry([
        { type: 'archive', pageId: PAGE_ID },
        { type: 'moments', pageId: momentsId },
    ], [entry(), moments])

    assert.equal(registry.get(momentsId)?.type, 'moments')
    assert.equal(registry.get(PAGE_ID)?.type, 'archive')
})

test('allows a moments page to override an indexed post entry', () => {
    const registry = buildSpecialPageRegistry([{ type: 'moments', pageId: PAGE_ID }], [entry({ kind: 'post' })])
    assert.equal(registry.get(PAGE_ID)?.type, 'moments')
})

for (const [name, configs, entries, code] of [
    [
        'rejects duplicate archive configurations',
        [
            { type: 'archive', pageId: PAGE_ID },
            { type: 'archive', pageId: PAGE_ID },
        ],
        [entry()],
        'DUPLICATE_TYPE',
    ],
    [
        'rejects two special types targeting the same page',
        [
            { type: 'archive', pageId: PAGE_ID },
            { type: 'moments', pageId: PAGE_ID },
        ],
        [entry()],
        'DUPLICATE_PAGE',
    ],
    ['rejects malformed page IDs', [{ type: 'archive', pageId: 'not-a-page-id' }], [entry()], 'INVALID_PAGE_ID'],
    ['rejects missing pages', [{ type: 'archive', pageId: PAGE_ID }], [], 'PAGE_NOT_FOUND'],
    [
        'rejects post targets',
        [{ type: 'archive', pageId: PAGE_ID }],
        [entry({ kind: 'post' })],
        'INVALID_PAGE_KIND',
    ],
] as const) {
    test(name, () => {
        assert.throws(
            () => buildSpecialPageRegistry(configs, entries),
            (error: unknown) => error instanceof SpecialPageConfigError && error.code === code,
        )
    })
}

test('rejects unsupported special page types at runtime', () => {
    assert.throws(
        () => buildSpecialPageRegistry([{ type: 'unknown', pageId: PAGE_ID } as never], [entry()]),
        (error: unknown) => error instanceof SpecialPageConfigError && error.code === 'UNSUPPORTED_TYPE',
    )
})
