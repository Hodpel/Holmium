import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)

const url = new URL('./CodeFrame.tsx', import.meta.url)
const output = ts.transpileModule(readFileSync(url, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText
const compiledModule = { exports: {} }
new Function('require', 'module', 'exports', output)(require, compiledModule, compiledModule.exports)
const { copyCodeText } = compiledModule.exports

test('highlights code safely without rendering clipboard controls', async () => {
    const { highlightCode } = await import('./prismLanguages.ts')
    const html = await highlightCode('const example = "<script>";', 'JavaScript')
    assert.match(html, /class="token keyword"/)
    assert.match(html, /&lt;script>/)
    assert.doesNotMatch(html, /<script>|<button|notion-code-copy/)
})

test('normalizes language aliases and retains plain text for unknown languages', async () => {
    const { highlightCode } = await import('./prismLanguages.ts')
    assert.match(await highlightCode('<div></div>', ' HTML '), /class="token tag"/)
    assert.equal(await highlightCode('example', 'unknown-language'), null)
})

test('renders an accessible copy button outside the code scroll area without a popup', () => {
    const html = renderToStaticMarkup(React.createElement(compiledModule.exports.default, {
        content: 'example', labels: { copy: 'Copy code', copied: 'Copied', failed: 'Copy failed' },
    }, React.createElement('pre', { className: 'notion-code' }, React.createElement('code', null, 'example'))))
    assert.match(html, /<button[^>]*type="button"[^>]*aria-label="Copy code"/)
    assert.match(html, /<\/pre><button/)
    const codeMarkup = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/)?.[1]
    assert.ok(codeMarkup)
    assert.doesNotMatch(codeMarkup, /<button/)
    assert.doesNotMatch(html, /notion-code-copy-tooltip/)
})

test('copies the complete code without trimming whitespace', async () => {
    let clipboard = ''
    const copied = await copyCodeText('  example\n\n', async (text) => { clipboard = text })
    assert.equal(copied, true)
    assert.equal(clipboard, '  example\n\n')
})

test('keeps both decorative icons mounted so their visibility can transition independently', () => {
    const html = renderToStaticMarkup(React.createElement(compiledModule.exports.default, {
        content: 'example', labels: { copy: 'Copy code', copied: 'Copied', failed: 'Copy failed' },
    }))
    assert.match(html, /<svg(?=[^>]*aria-hidden="true")(?=[^>]*class="[^"]*holmium-code-copy-icon)[^>]*>/)
    assert.match(html, /<svg(?=[^>]*aria-hidden="true")(?=[^>]*class="[^"]*holmium-code-check-icon)[^>]*>/)
    assert.equal((html.match(/<button\b/g) || []).length, 1)
})

test('does not report success until the clipboard write completes', async () => {
    let complete
    let settled = false
    const pending = copyCodeText('example', () => new Promise((resolve) => { complete = resolve }))
        .then((result) => { settled = true; return result })
    await Promise.resolve()
    assert.equal(settled, false)
    complete()
    assert.equal(await pending, true)
})

test('reports failure when clipboard permission is denied', async () => {
    assert.equal(await copyCodeText('example', async () => { throw new Error('denied') }), false)
})

test('reports failure when the clipboard API is unavailable', async () => {
    assert.equal(await copyCodeText('example', undefined), false)
})
