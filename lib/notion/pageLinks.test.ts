import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveSiteHref } from './pageLinks.ts'

test('converts same-site absolute links to local paths while preserving search and hash', () => {
    assert.equal(
        resolveSiteHref('http://example.com/%E6%96%87%E7%AB%A0?from=notion#section', 'https://example.com'),
        '/%E6%96%87%E7%AB%A0?from=notion#section',
    )
})

test('keeps other hosts, subdomains and ports outside the local-site boundary', () => {
    assert.equal(resolveSiteHref('https://outside.example/%E6%96%87%E7%AB%A0', 'https://example.com'), null)
    assert.equal(resolveSiteHref('https://docs.example.com/%E6%96%87%E7%AB%A0', 'https://example.com'), null)
    assert.equal(resolveSiteHref('https://example.com:8443/%E6%96%87%E7%AB%A0', 'https://example.com'), null)
})
