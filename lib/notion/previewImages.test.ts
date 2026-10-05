import assert from 'node:assert/strict'
import test from 'node:test'

import type { ExtendedRecordMap, PreviewImage } from 'notion-types'

import {
    buildPreviewImageMap,
    collectPreviewImageUrls,
    getPreviewImageMaxDimension,
    loadPreviewImage,
} from './previewImages.ts'
import {
    buildVideoPreviewStyleSheet,
    calculateVideoDisplayHeight,
    collectVideoPreviewDescriptors,
    collectVideoThumbnailUrls,
} from './videoPreview.ts'

function record(value: Record<string, unknown>) {
    return { role: 'reader', value }
}

test('collectPreviewImageUrls includes content images and covers but excludes icons', () => {
    const recordMap = {
        block: {
            image: record({
                id: 'image',
                type: 'image',
                properties: { source: [['https://assets.example/body.jpg']] },
            }),
            page: record({
                id: 'page',
                type: 'page',
                parent_id: 'collection',
                parent_table: 'collection',
                format: {
                    page_cover: 'https://assets.example/page-cover.webp',
                    page_icon: 'https://assets.example/page-icon.png',
                },
                properties: {
                    file: [['board cover', [['a', 'https://assets.example/property-cover.png']]]],
                    website: [['site', [['a', 'https://example.com/not-an-image']]]],
                },
            }),
            bookmark: record({
                id: 'bookmark',
                type: 'bookmark',
                format: {
                    bookmark_cover: 'https://assets.example/bookmark-cover.jpg',
                    bookmark_icon: 'https://assets.example/bookmark-icon.png',
                },
            }),
            video: record({
                id: 'video',
                type: 'video',
                format: {
                    video_thumbnail: 'https://assets.example/video-thumbnail.jpg',
                },
            }),
        },
        collection: {
            collection: record({
                id: 'collection',
                schema: {
                    file: { name: 'Cover', type: 'file' },
                    website: { name: 'Website', type: 'url' },
                },
            }),
        },
        signed_urls: {},
    } as unknown as ExtendedRecordMap

    assert.deepEqual(collectPreviewImageUrls(recordMap, (url) => url), [
        'https://assets.example/body.jpg',
        'https://assets.example/page-cover.webp',
        'https://assets.example/property-cover.png',
        'https://assets.example/bookmark-cover.jpg',
        'https://assets.example/video-thumbnail.jpg',
    ])
})

test('collectVideoThumbnailUrls includes only video preview sources', () => {
    const recordMap = {
        block: {
            image: record({
                id: 'image',
                type: 'image',
                properties: { source: [['https://assets.example/photo.jpg']] },
            }),
            video: record({
                id: 'video',
                type: 'video',
                format: { video_thumbnail: 'https://assets.example/video-thumbnail.jpg' },
            }),
        },
        signed_urls: {},
    } as unknown as ExtendedRecordMap

    assert.deepEqual(collectVideoThumbnailUrls(recordMap, (url) => url), [
        'https://assets.example/video-thumbnail.jpg',
    ])
})

test('getPreviewImageMaxDimension reserves 32px only for video thumbnails', () => {
    const videoThumbnailUrls = new Set(['https://assets.example/video-thumbnail.jpg'])

    assert.equal(getPreviewImageMaxDimension('https://assets.example/video-thumbnail.jpg', videoThumbnailUrls), 32)
    assert.equal(getPreviewImageMaxDimension('https://assets.example/photo.jpg', videoThumbnailUrls), 16)
})

test('collectVideoPreviewDescriptors derives a responsive video ratio from its thumbnail preview', () => {
    const blockId = '12345678-1234-1234-1234-123456789abc'
    const preview: PreviewImage = {
        originalWidth: 496,
        originalHeight: 864,
        dataURIBase64: 'data:image/webp;base64,video-preview',
    }
    const recordMap = {
        block: {
            [blockId]: record({
                id: blockId,
                type: 'video',
                format: {
                    video_thumbnail: 'https://assets.example/video-thumbnail.jpg',
                },
            }),
        },
        signed_urls: {},
        preview_images: {
            'assets.example/video-thumbnail.jpg': preview,
        },
    } as unknown as ExtendedRecordMap

    assert.deepEqual(collectVideoPreviewDescriptors(recordMap, (url: string | undefined) => url), [
        {
            blockId: '12345678123412341234123456789abc',
            width: 496,
            height: 864,
            dataURIBase64: 'data:image/webp;base64,video-preview',
            thumbnailUrl: 'https://assets.example/video-thumbnail.jpg',
        },
    ])
})

test('buildVideoPreviewStyleSheet keeps the video LQIP unfiltered', () => {
    const styleSheet = buildVideoPreviewStyleSheet([
        {
            blockId: '12345678123412341234123456789abc',
            width: 496,
            height: 864,
            dataURIBase64: 'data:image/webp;base64,video-preview',
            thumbnailUrl: 'https://assets.example/video-thumbnail.jpg',
        },
    ])

    assert.match(styleSheet, /\.notion-block-12345678123412341234123456789abc/)
    assert.match(styleSheet, /aspect-ratio: 496 \/ 864/)
    assert.match(styleSheet, /background-image: url\("data:image\/webp;base64,video-preview"\)/)
    assert.doesNotMatch(styleSheet, /filter:/)
    assert.doesNotMatch(styleSheet, /transform:/)
})

test('calculateVideoDisplayHeight preserves the intrinsic ratio for the metadata fallback', () => {
    assert.equal(calculateVideoDisplayHeight(708, 496, 864), (708 * 864) / 496)
    assert.equal(calculateVideoDisplayHeight(708, 0, 864), null)
})

test('buildPreviewImageMap isolates a failed image from successful previews', async () => {
    const preview: PreviewImage = {
        originalWidth: 1200,
        originalHeight: 800,
        dataURIBase64: 'data:image/webp;base64,preview',
    }

    const result = await buildPreviewImageMap(
        ['https://assets.example/good.jpg', 'https://assets.example/broken.jpg'],
        async (url) => {
            if (url.endsWith('/broken.jpg')) throw new Error('upstream unavailable')
            return preview
        },
    )

    assert.deepEqual(result, {
        'assets.example/good.jpg': preview,
        'assets.example/broken.jpg': null,
    })
})

test('buildPreviewImageMap respects the requested concurrency limit', async () => {
    let active = 0
    let maxActive = 0
    const preview: PreviewImage = {
        originalWidth: 800,
        originalHeight: 600,
        dataURIBase64: 'data:image/webp;base64,preview',
    }

    await buildPreviewImageMap(
        Array.from({ length: 6 }, (_, index) => `https://assets.example/${index}.jpg`),
        async () => {
            active += 1
            maxActive = Math.max(maxActive, active)
            await new Promise((resolve) => setTimeout(resolve, 5))
            active -= 1
            return preview
        },
        { concurrency: 2 },
    )

    assert.equal(maxActive, 2)
})

test('buildPreviewImageMap propagates the parent request cancellation reason', async () => {
    const controller = new AbortController()
    controller.abort(new DOMException('request budget exceeded', 'TimeoutError'))

    await assert.rejects(
        buildPreviewImageMap(['https://assets.example/photo.jpg'], async () => {
            throw controller.signal.reason
        }, { signal: controller.signal }),
        { name: 'TimeoutError' },
    )
})

test('buildPreviewImageMap returns completed previews when optional generation is cancelled', async () => {
    const controller = new AbortController()
    const preview: PreviewImage = {
        originalWidth: 1200,
        originalHeight: 800,
        dataURIBase64: 'data:image/webp;base64,preview',
    }

    const result = await buildPreviewImageMap(
        ['https://assets.example/completed.jpg', 'https://assets.example/pending.jpg'],
        async (url) => {
            if (url.endsWith('/completed.jpg')) {
                controller.abort(new DOMException('preview budget exceeded', 'TimeoutError'))
                return preview
            }
            throw controller.signal.reason
        },
        { concurrency: 1, signal: controller.signal, returnPartialOnAbort: true },
    )

    assert.deepEqual(result, { 'assets.example/completed.jpg': preview })
})

test('loadPreviewImage keeps ordinary image previews at 16px', async () => {
    let receivedResize: number | undefined
    const result = await loadPreviewImage('https://assets.example/photo.jpg', {
        fetchImage: async () =>
            new Response(new Uint8Array([1, 2, 3]), {
                status: 200,
                headers: { 'content-type': 'image/jpeg' },
            }),
        createLqip: async (_input, options) => {
            receivedResize = options?.resize
            return {
                metadata: {
                    originalWidth: 1600,
                    originalHeight: 900,
                    dataURIBase64: 'data:image/webp;base64,generated',
                },
            }
        },
    })

    assert.equal(receivedResize, 16)
    assert.deepEqual(result, {
        originalWidth: 1600,
        originalHeight: 900,
        dataURIBase64: 'data:image/webp;base64,generated',
    })
})

test('loadPreviewImage accepts the 32px video thumbnail size', async () => {
    let receivedResize: number | undefined
    await loadPreviewImage('https://assets.example/video-thumbnail.jpg', {
        fetchImage: async () =>
            new Response(new Uint8Array([1, 2, 3]), {
                status: 200,
                headers: { 'content-type': 'image/jpeg' },
            }),
        createLqip: async (_input, options) => {
            receivedResize = options?.resize
            return {
                metadata: {
                    originalWidth: 496,
                    originalHeight: 864,
                    dataURIBase64: 'data:image/webp;base64,video-preview',
                },
            }
        },
        maxDimension: 32,
    })

    assert.equal(receivedResize, 32)
})

test('loadPreviewImage creates a first-frame preview for a GIF response', async () => {
    let receivedInput: ArrayBuffer | undefined
    const result = await loadPreviewImage('https://assets.example/animation.gif', {
        fetchImage: async () =>
            new Response(new Uint8Array([71, 73, 70]), {
                status: 200,
                headers: { 'content-type': 'image/gif' },
            }),
        createLqip: async (input) => {
            receivedInput = input
            return {
                metadata: {
                    originalWidth: 640,
                    originalHeight: 360,
                    dataURIBase64: 'data:image/webp;base64,gif-preview',
                },
            }
        },
    })

    assert.equal(receivedInput?.byteLength, 3)
    assert.deepEqual(result, {
        originalWidth: 640,
        originalHeight: 360,
        dataURIBase64: 'data:image/webp;base64,gif-preview',
    })
})

test('loadPreviewImage skips unsupported image formats', async () => {
    const result = await loadPreviewImage('https://assets.example/vector.svg', {
        fetchImage: async () =>
            new Response('<svg />', {
                status: 200,
                headers: { 'content-type': 'image/svg+xml' },
            }),
        createLqip: async () => {
            throw new Error('SVG should not be decoded')
        },
    })

    assert.equal(result, null)
})
