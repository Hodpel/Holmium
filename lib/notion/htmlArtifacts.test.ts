import assert from 'node:assert/strict'
import test from 'node:test'
import type { ExtendedRecordMap } from 'notion-types'
import { projectHtmlArtifactUrls } from './htmlArtifacts.ts'

function fixture(source: string, version: number) {
    return { block: { html: { role: 'reader', value: {
        id: 'html', type: 'embed', version, format: { embed_variant: 'html_artifact' }, properties: { source: [[source]] },
    } } }, signed_urls: {} } as unknown as ExtendedRecordMap
}

test('HTML asset links survive article edits but change when the attached file changes', () => {
    const first = fixture('attachment:file:demo.html', 1)
    const edited = fixture('attachment:file:demo.html', 2)
    const replaced = fixture('attachment:new-file:demo.html', 2)
    const original = projectHtmlArtifactUrls(first, 'page').signed_urls.html
    assert.equal(projectHtmlArtifactUrls(edited, 'page').signed_urls.html, original)
    assert.notEqual(projectHtmlArtifactUrls(replaced, 'page').signed_urls.html, original)
    assert.equal(new URL(original, 'https://example.com').searchParams.has('asset'), true)
    assert.deepEqual(first.signed_urls, {})
})

test('subpage HTML assets retain their asset key and carry parent authorization context', () => {
    const map = fixture('attachment:file:demo.html', 1)
    const ordinary = new URL(projectHtmlArtifactUrls(map, 'page').signed_urls.html, 'https://example.com')
    const subpage = new URL(projectHtmlArtifactUrls(map, 'page', 'parent').signed_urls.html, 'https://example.com')
    assert.equal(subpage.searchParams.get('parent'), 'parent')
    assert.equal(subpage.searchParams.get('asset'), ordinary.searchParams.get('asset'))
    assert.equal(ordinary.searchParams.has('parent'), false)
    assert.deepEqual(map.signed_urls, {})
})
