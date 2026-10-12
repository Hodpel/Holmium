import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import nextConfig from '../../next.config.ts'
import * as presentation from '../../lib/notion/mediaPresentation.ts'
import * as mediaFrame from '../../lib/notion/mediaFrame.ts'

const require = createRequire(import.meta.url)
const { ImageConfigContext } = require('next/dist/shared/lib/image-config-context.shared-runtime.js')
const { imageConfigDefault } = require('next/dist/shared/lib/image-config.js')
const output = ts.transpileModule(readFileSync(new URL('./FileMediaEmbed.tsx', import.meta.url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
const compiled = { exports: {} }
new Function('require', 'module', 'exports', output)(name => {
    if (name === '@/lib/notion/mediaPresentation') return presentation
    if (name === '@/lib/locale') return JSON.parse(readFileSync(new URL('../../lib/locale/en-US.json', import.meta.url), 'utf8'))
    return require(name)
}, compiled, compiled.exports)
const components = compiled.exports

function render(media, block = { id: 'example', type: 'embed', format: { block_width: 400 } }) {
    return renderToStaticMarkup(React.createElement(ImageConfigContext.Provider, { value: { ...imageConfigDefault, ...nextConfig.images } },
        React.createElement(components.FileMediaDocument, { media: new Map(media ? [['example', media]] : []) }, React.createElement(components.default, { block, blockId: 'notion-example' }))))
}
const video = { blockId: 'example', kind: 'video', src: '/sample.mp4', poster: 'https://app.notion.com/image/example.jpg?table=block', reservedRatio: [16, 9], intrinsicRatioKnown: false }

test('server video retains its poster without an extra activation button or inert runtime', () => {
    const html = render(video)
    assert.match(html, /<figure/)
    assert.match(html, /class="holmium-file-asset" style="[^"]*width:400px/)
    assert.match(html, /data-surface="preview"/)
    assert.match(html, /<img/)
    assert.match(html, /<canvas[^>]*width="0"[^>]*height="0"/)
    assert.doesNotMatch(html, /<button|inert=""|<video|<iframe|controls=""|>Play<|Loading/)
})
test('server audio reserves its final toolbar without a temporary video-style entrance', () => {
    const html = render({ ...video, kind: 'audio', poster: undefined })
    assert.match(html, /holmium-file-audio/)
    assert.doesNotMatch(html, /<img|<button|<video|>Play<|Loading/)
})
test('non-target Embed dispatches to the upstream component rather than itself', () => {
    const html = render(null, { id: 'other', type: 'embed', properties: { source: [['https://example.com/embed']] }, format: {} })
    assert.match(html, /<iframe/)
    assert.doesNotMatch(html, /holmium-file-/)
})

test('YouTube and Vimeo videos keep their upstream embeds without file-player controls', () => {
    const youtube = render(null, { id: 'youtube', type: 'video', properties: { source: [['https://www.youtube.com/watch?v=aqz-KE-bpKQ']] }, format: {} })
    const vimeo = render(null, { id: 'vimeo', type: 'video', properties: { source: [['https://vimeo.com/76979871']] }, format: { display_source: 'https://player.vimeo.com/video/76979871' } })
    assert.match(youtube, /aqz-KE-bpKQ/)
    assert.match(vimeo, /<iframe/)
    assert.match(vimeo, /player\.vimeo\.com/)
    for (const html of [youtube, vimeo]) assert.doesNotMatch(html, /holmium-file-|media-skin/)
})

test('video recovery layers are children of the real Default fullscreen container', () => {
    const output = ts.transpileModule(readFileSync(new URL('./FileMediaPlayer.tsx', import.meta.url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
    const compiled = { exports: {} }
    new Function('require', 'module', 'exports', output)(name => {
        if (name === '@/lib/notion/mediaFrame') return mediaFrame
        if (name === '@/blog.config') return { locale: 'en-US' }
        return require(name)
    }, compiled, compiled.exports)
    const recovery = React.createElement('canvas', { 'data-test-recovery': true })
    const html = renderToStaticMarkup(React.createElement(compiled.exports.FileMediaPlayer, { media: video, playRequest: null, active: true, frozenFrame: { current: null }, onFramePresented() {}, onFrozenChange() {}, onFailure() {}, recovery }))
    assert.match(html, /class="[^"]*video-skin/)
    assert.match(html, /<video[^>]*>[\s\S]*?<canvas data-test-recovery="true"/)
})
