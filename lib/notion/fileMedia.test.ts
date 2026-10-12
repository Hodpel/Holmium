import assert from 'node:assert/strict'
import test from 'node:test'
import type { ExtendedRecordMap } from 'notion-types'
import { getBlockValue } from 'notion-utils'

import * as api from './fileMedia.ts'
const fixture = () => ({ block: {
    video: { role: 'reader', value: { id: 'video', type: 'video', parent_id: 'page', properties: { source: [['attachment:video:sample.mp4']], caption: [['Example']] }, format: { block_width: 400, block_height: 200, video_thumbnail: 'https://assets.example/thumb.jpg' } } },
    audio: { role: 'reader', value: { id: 'audio', type: 'audio', properties: { source: [['https://assets.example/sample.mp3']] } } },
    platform: { role: 'reader', value: { id: 'platform', type: 'video', properties: { source: [['https://www.youtube.com/watch?v=aqz-KE-bpKQ']] } } },
    embed: { role: 'reader', value: { id: 'embed', type: 'embed', properties: { source: [['https://example.com/embed']] } } },
}, signed_urls: { video: '/-/notion-file/page/video?parent=parent' }, preview_images: {} }) as unknown as ExtendedRecordMap

function freeze(value: unknown) {
    if (!value || typeof value !== 'object') return
    Object.freeze(value)
    Object.values(value).forEach(freeze)
}

test('file projection preserves frozen data, stable URLs and posters without LQIP', () => {
    const original = fixture()
    const before = structuredClone(original)
    freeze(original)
    const result = api.projectFileMediaBlocks(original)
    assert.deepEqual(original, before)
    assert.equal(getBlockValue(result.recordMap.block.video)?.type, 'embed')
    assert.equal(result.media.get('video')?.src, '/-/notion-file/page/video?parent=parent')
    assert.equal(result.media.get('video')?.poster, 'https://assets.example/thumb.jpg')
    assert.equal(result.media.get('video')?.preview, undefined)
    assert.deepEqual(result.media.get('video')?.reservedRatio, [400, 200])
    assert.equal(result.media.get('video')?.intrinsicRatioKnown, false)
    assert.deepEqual(result.media.get('video')?.caption, [['Example']])
    assert.equal(result.media.get('audio')?.kind, 'audio')
    assert.equal(result.recordMap.block.platform, original.block.platform)
    assert.equal(result.recordMap.block.embed, original.block.embed)
    const repeated = api.projectFileMediaBlocks(result.recordMap)
    assert.deepEqual(repeated.recordMap, result.recordMap)
    assert.equal(repeated.media.get('video'), result.media.get('video'))
})

test('platform media and documents without targets retain their original rendering path', () => {
    const original = fixture()
    original.block = { platform: original.block.platform, embed: original.block.embed }
    const result = api.projectFileMediaBlocks(original)
    assert.equal(result.recordMap, original)
    assert.equal(result.media.size, 0)
})

test('file rendering reuses the generated thumbnail pixels and intrinsic ratio', () => {
    const original = fixture()
    original.preview_images = { 'assets.example/thumb.jpg': { originalWidth: 496, originalHeight: 864, dataURIBase64: 'data:image/webp;base64,preview' } }
    const video = api.projectFileMediaBlocks(original).media.get('video')!
    assert.equal(video.preview, 'data:image/webp;base64,preview')
    assert.deepEqual(video.reservedRatio, [496, 864])
    assert.equal(video.intrinsicRatioKnown, true)
})
