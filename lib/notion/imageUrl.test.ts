import assert from 'node:assert/strict'
import test from 'node:test'

import type { Block } from 'notion-types'

import { mapNotionImageUrl } from './imageUrl.ts'

test('mapNotionImageUrl preserves projected local asset URLs', () => {
    const projectedBlock = { id: 'block', type: 'image' } as Block

    assert.equal(mapNotionImageUrl('/-/notion-html/page/block', projectedBlock), '/-/notion-html/page/block')
})
