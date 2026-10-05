import assert from 'node:assert/strict'
import test from 'node:test'
import type { Block, ExtendedRecordMap } from 'notion-types'
import { getBlockValue, getSignedFileUrl } from 'notion-utils'
import { createFileUrlResolver, getPageFileBlock, prepareFileSigning, projectFileUrls } from './fileResources.ts'

const source = 'attachment:11111111-1111-4111-8111-111111111111:sample.mp4'
const url = (expires: number) => `https://file.notion.so/f/f/space/11111111-1111-4111-8111-111111111111/sample.mp4?signature=test&expirationTimestamp=${expires}`
const block = (id: string, type: string, src = source) => ({ id, type, properties: { source: [[src]] } }) as Block
function fixture() {
    const blocks = [block('video', 'video'), block('audio', 'audio'), block('pdf', 'pdf'), block('file', 'file'),
        block('image', 'image'), block('embed', 'embed'), block('external', 'video', 'https://youtu.be/example'), block('unrelated', 'file')]
    return {
        block: Object.fromEntries([
            ['page', { role: 'reader', value: { id: 'page', type: 'page', content: blocks.filter(b => b.id !== 'unrelated').map(b => b.id) } }],
            ...blocks.map(value => [value.id, { role: 'reader', value }]),
        ]),
        signed_urls: {},
    } as unknown as ExtendedRecordMap
}

test('only the four uploaded resource types receive a stable route without mutating the cached record map', () => {
    const original = fixture()
    // Distinct image source keeps its existing signature independent of media routes.
    original.block.image.value = block('image', 'image', 'attachment:image:cover.png')
    const projected = projectFileUrls(original, 'page')
    for (const type of ['video', 'audio', 'pdf', 'file']) {
        assert.equal(projected.signed_urls[type], `/-/notion-file/page/${type}`)
    }
    for (const id of ['image', 'embed', 'external', 'unrelated']) assert.equal(projected.signed_urls[id], undefined)
    assert.deepEqual(original.signed_urls, {})
    assert.equal(getSignedFileUrl(source, block('video', 'video'), projected.signed_urls)?.startsWith('/-/notion-file/'), true)
})

test('resource lookup rejects unrelated, external and unsupported blocks', () => {
    const map = fixture()
    assert.equal(getPageFileBlock(map, 'page', 'file')?.id, 'file')
    for (const id of ['unrelated', 'external', 'image', 'embed', 'missing']) assert.equal(getPageFileBlock(map, 'page', id), undefined)
})

test('subpage media URLs carry parent context without changing ordinary article URLs', () => {
    const map = fixture()
    const projected = projectFileUrls(map, 'page', 'parent')
    assert.equal(projected.signed_urls.video, '/-/notion-file/page/video?parent=parent')
    assert.equal(projectFileUrls(map, 'page').signed_urls.video, '/-/notion-file/page/video')
    assert.deepEqual(map.signed_urls, {})
})

test('page signing skips media payloads while retaining thumbnails and other resources', () => {
    const map = fixture()
    map.block.video.value = { ...block('video', 'video'), format: { video_thumbnail: 'attachment:thumbnail:preview.jpg' } } as Block
    const signing = prepareFileSigning(map)
    assert.deepEqual(getBlockValue(signing.block.video)?.properties?.source, [])
    assert.deepEqual(map.block.video.value.properties?.source, [[source]])
    assert.equal(Reflect.get(getBlockValue(signing.block.video)!.format!, 'video_thumbnail'), 'attachment:thumbnail:preview.jpg')
    assert.equal(signing.block.image, map.block.image)
})

test('valid signatures are reused and concurrent first requests share one signing call', async () => {
    let calls = 0
    const expected = url(Date.now() + 3600000)
    const resolve = createFileUrlResolver(async () => { calls++; return expected })
    assert.deepEqual(await Promise.all([resolve('video', source), resolve('video', source)]), [expected, expected])
    assert.equal(await resolve('video', source), expected)
    assert.equal(calls, 1)
})

test('Chinese attachment names produce a valid redirect Location header', async () => {
    const chineseSource = source.replace('sample.mp4', '中文附件.txt')
    const resolve = createFileUrlResolver(async () => url(Date.now() + 3600000).replace('sample.mp4', '中文附件.txt'))
    const location = await resolve('file', chineseSource)
    const response = new Response(null, { status: 307, headers: { Location: location } })
    assert.match(response.headers.get('Location')!, /%E4%B8%AD%E6%96%87/)
})

for (const { name, elapsed, refresh } of [
    { name: 'valid signature remains cached', elapsed: 3539999, refresh: false },
    { name: 'signature at the safety boundary is refreshed', elapsed: 3540000, refresh: true },
    { name: 'signature at expiration is refreshed', elapsed: 3600000, refresh: true },
    { name: 'signature expired for several hours is refreshed', elapsed: 14400000, refresh: true },
]) {
    test(name, async (t) => {
        const now = Date.UTC(2026, 8, 11)
        t.mock.timers.enable({ apis: ['Date'], now })
        let calls = 0
        const resolve = createFileUrlResolver(async (blockId, requestedSource) => {
            assert.equal(blockId, 'video')
            assert.equal(requestedSource, source)
            calls++
            return url(Date.now() + 3600000)
        })
        const first = await resolve('video', source)
        t.mock.timers.setTime(now + elapsed)
        // A burst after expiry must trigger one refresh, not one per viewer.
        const results = await Promise.all(Array.from({ length: 10 }, () => resolve('video', source)))
        assert.deepEqual(results, Array(10).fill(refresh ? url(now + elapsed + 3600000) : first))
        assert.equal(calls, refresh ? 2 : 1)
        assert.equal(await resolve('video', source), results[0])
        assert.equal(calls, refresh ? 2 : 1)
    })
}

test('a failed renewal never returns the expired URL and the next request can recover', async (t) => {
    const now = Date.UTC(2026, 8, 11)
    t.mock.timers.enable({ apis: ['Date'], now })
    let calls = 0
    const resolve = createFileUrlResolver(async () => {
        if (++calls === 2) throw new Error('Signing service unavailable')
        return url(Date.now() + 3600000)
    })
    await resolve('video', source)
    t.mock.timers.setTime(now + 3600001)
    const failed = await Promise.allSettled(Array.from({ length: 10 }, () => resolve('video', source)))
    assert.ok(failed.every(result => result.status === 'rejected'))
    assert.equal(calls, 2)
    assert.equal(await resolve('video', source), url(now + 7200001))
    assert.equal(calls, 3)
})

test('failed, expired, wrong-file and unsafe signing responses are not cached', async () => {
    for (const bad of [undefined, url(Date.now() - 1), url(0), 'https://evil.example/file', url(Date.now() + 3600000).replace('sample.mp4', 'other.mp4'), url(Date.now() + 3600000).replace('https:', 'http:')]) {
        let calls = 0
        const expected = url(Date.now() + 3600000)
        const resolve = createFileUrlResolver(async () => ++calls === 1 ? bad : expected)
        await assert.rejects(resolve('video', source))
        assert.equal(await resolve('video', source), expected)
    }
})

test('legacy Notion S3 signatures remain usable', async () => {
    const source = 'https://prod-files-secure.s3.us-west-2.amazonaws.com/space/file/report.pdf'
    const signed = source + '?X-Amz-Signature=test&X-Amz-Date=20990101T000000Z&X-Amz-Expires=3600'
    const resolve = createFileUrlResolver(async () => signed)
    assert.equal(await resolve('pdf', source), signed)
})
