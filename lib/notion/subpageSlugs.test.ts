import assert from 'node:assert/strict'
import test from 'node:test'
import { shortSubpageId, findSubpageBySegment, readableSubpageHref } from './subpageSlugs.ts'

test('short IDs lengthen only for siblings with colliding suffixes', () => {
    const ids = ['11111111-1111-4111-8111-111111aa9803', '22222222-2222-4222-8222-222222bb9803']
    assert.equal(shortSubpageId(ids[0], [ids[0]]), '9803')
    assert.equal(shortSubpageId(ids[0], ids), 'aa9803')
    assert.equal(findSubpageBySegment('old-title-9803', ids), null)
    assert.equal(findSubpageBySegment('renamed-aa9803', ids), ids[0])
    assert.equal(findSubpageBySegment('title-803', ids), null)
    assert.equal(readableSubpageHref('父/文章', '子?文章', ids[0], ids), '/%E7%88%B6%2F%E6%96%87%E7%AB%A0/%E5%AD%90%3F%E6%96%87%E7%AB%A0-aa9803')
})
