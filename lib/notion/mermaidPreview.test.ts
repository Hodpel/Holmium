import assert from 'node:assert/strict'
import test from 'node:test'

import {
    getMermaidImageSource,
    isMermaidLinkTarget,
    openMermaidLinksInNewTab,
} from './mermaidPreview.ts'

test('distinguishes Mermaid links from ordinary diagram targets', () => {
    const linkTarget = { closest: (selector: string) => (selector === 'a' ? {} : null) }
    const diagramTarget = { closest: () => null }

    assert.equal(isMermaidLinkTarget(linkTarget), true)
    assert.equal(isMermaidLinkTarget(diagramTarget), false)
})

test('creates an SVG image source with intrinsic dimensions for medium zoom', () => {
    const source = getMermaidImageSource('<svg width="100%" viewBox="0 0 640 360"><text>图表</text></svg>')
    const decoded = decodeURIComponent(source.replace('data:image/svg+xml;charset=utf-8,', ''))

    assert.equal(source.startsWith('data:image/svg+xml;charset=utf-8,'), true)
    assert.match(decoded, /^<svg width="640" height="360" viewBox="0 0 640 360">/)
    assert.match(decoded, /<rect width="100%" height="100%" fill="#fff"\/>/)
    assert.match(decoded, /<text>图表<\/text>/)
})

test('opens Mermaid links in a new tab without allowing opener access', () => {
    const svg = '<svg><a href="https://example.com" target="_self" rel="opener"><text>访问</text></a></svg>'

    assert.equal(
        openMermaidLinksInNewTab(svg),
        '<svg><a href="https://example.com" target="_blank" rel="noopener noreferrer"><text>访问</text></a></svg>',
    )
})
