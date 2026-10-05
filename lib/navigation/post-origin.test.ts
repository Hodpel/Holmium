import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPostOrigin } from './post-origin.ts'

test('preserves the source hash while keeping the target route hash-free', () => {
    assert.deepEqual(
        buildPostOrigin(
            { origin: 'https://example.com', pathname: '/archive', search: '?view=all', hash: '#2026' },
            '/article?from=archive#ignored',
        ),
        { source: '/archive?view=all#2026', target: '/article?from=archive' },
    )
})
