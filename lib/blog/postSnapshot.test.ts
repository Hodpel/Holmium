import assert from 'node:assert/strict'
import test from 'node:test'
import type { ExtendedRecordMap } from 'notion-types'
import type { BlogIndex } from './types.ts'
import { resolvePostSnapshot } from './postSnapshot.ts'

const post = { id: 'page', slug: 'article', title: 'Article', kind: 'post', tags: [] }
const index = { entries: [post], contentRevisions: { page: 'v2' } } as unknown as BlogIndex
const recordMap = { block: {} } as ExtendedRecordMap

test('article snapshot waits for the body and uses the revision from its own index', async () => {
    let finish!: (value: ExtendedRecordMap) => void
    let complete = false
    const body = new Promise<ExtendedRecordMap>(resolve => { finish = resolve })
    const snapshot = resolvePostSnapshot('article', index, async (id, revision) => {
        assert.equal(id, 'page')
        assert.equal(revision, 'v2')
        return body
    }).then(value => { complete = true; return value })
    await Promise.resolve()
    assert.equal(complete, false)
    finish(recordMap)
    assert.deepEqual(await snapshot, { post, recordMap })
})

test('body failure rejects the whole snapshot instead of publishing a new title alone', async () => {
    await assert.rejects(resolvePostSnapshot('article', index, async () => {
        throw new Error('Notion unavailable')
    }), /Notion unavailable/)
})

test('missing articles do not trigger a body request', async () => {
    assert.equal(await resolvePostSnapshot('missing', index, async () => {
        assert.fail('No body should be requested')
    }), null)
})

test('a missing content revision is rejected rather than sharing an unversioned body', async () => {
    await assert.rejects(resolvePostSnapshot('article', { ...index, contentRevisions: {} }, async () => {
        assert.fail('No body should be requested')
    }), /revision/)
})
