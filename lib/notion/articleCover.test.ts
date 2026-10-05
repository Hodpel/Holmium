import assert from 'node:assert/strict'
import test from 'node:test'
import type { ExtendedRecordMap } from 'notion-types'
import { getArticleCover } from './articleCover.ts'

function fixture(cover?: string, position?: number) {
    return { block: { page: { role: 'reader', value: { id: 'page', type: 'page', parent_table: 'block', space_id: 'space', format: { page_cover: cover, page_cover_position: position } } } } } as unknown as ExtendedRecordMap
}

test('missing and unsafe covers do not create a decorative background', () => {
    assert.equal(getArticleCover(fixture(), 'page'), null)
    assert.equal(getArticleCover(fixture('javascript:alert(1)'), 'page'), null)
})

test('uses the stable Notion image mapper and preserves cover crop direction', () => {
    const result = getArticleCover(fixture('attachment:file:cover.jpg', 0.2), 'page')!
    assert.ok(result.src.includes('/image/attachment'))
    assert.equal(result.position, 80)
    assert.equal(getArticleCover(fixture('https://example.com/cover.jpg'), 'page')!.position, 50)
    assert.equal(getArticleCover(fixture('https://example.com/cover.jpg', 0), 'page')!.position, 100)
})

test('reuses the cached normalized cover preview without requiring one', () => {
    const recordMap = fixture('https://example.com/cover.jpg')
    recordMap.preview_images = {
        'example.com/cover.jpg': { originalWidth: 1200, originalHeight: 600, dataURIBase64: 'data:image/webp;base64,cHJldmlldw==' },
    }
    assert.equal(getArticleCover(recordMap, 'page')?.preview, 'data:image/webp;base64,cHJldmlldw==')
    assert.equal(getArticleCover(fixture('https://example.com/cover.jpg'), 'page')?.preview, undefined)
})
