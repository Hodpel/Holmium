import assert from 'node:assert/strict'
import test from 'node:test'

import { createMermaidRenderer, getVisibleMermaidSvg } from './mermaidRender.ts'

function deferred() {
    let resolve!: () => void
    const promise = new Promise<void>((complete) => {
        resolve = complete
    })

    return { promise, resolve }
}

test('keeps each Mermaid render paired with its own global theme configuration', async () => {
    const firstRenderStarted = deferred()
    const finishFirstRender = deferred()
    let configuredTheme = ''
    let renderCount = 0

    const render = createMermaidRenderer({
        initialize(options) {
            configuredTheme = options.theme
        },
        async render(_id, source) {
            renderCount += 1
            if (renderCount === 1) {
                firstRenderStarted.resolve()
                await finishFirstRender.promise
            }

            return { svg: `${configuredTheme}:${source}` }
        },
    })

    const lightResult = render('first', 'neutral')
    await firstRenderStarted.promise
    const darkResult = render('second', 'dark')
    finishFirstRender.resolve()

    assert.deepEqual(await Promise.all([lightResult, darkResult]), ['neutral:first', 'dark:second'])
})

test('keeps the current diagram visible while the same source is rerendered', () => {
    const readyState = {
        key: 'light:flowchart TD; A-->B',
        source: 'flowchart TD; A-->B',
        status: 'ready' as const,
        svg: '<svg>diagram</svg>',
    }

    assert.equal(getVisibleMermaidSvg(readyState, 'flowchart TD; A-->B'), '<svg>diagram</svg>')
    assert.equal(getVisibleMermaidSvg(readyState, 'flowchart TD; B-->C'), '')
})

test('yields a browser task between consecutive diagram renders', async () => {
    const events: string[] = []
    const render = createMermaidRenderer({
        initialize() {},
        async render(_id, source) {
            events.push(source)
            if (source === 'first') setTimeout(() => events.push('browser task'), 0)
            return { svg: source }
        },
    })
    await Promise.all([render('first', 'neutral'), render('second', 'neutral')])
    assert.deepEqual(events, ['first', 'browser task', 'second'])
})

test('skips a queued diagram after its component unmounts without blocking later renders', async () => {
    const started = deferred()
    const finish = deferred()
    const rendered: string[] = []
    const render = createMermaidRenderer({
        initialize() {},
        async render(_id, source) {
            rendered.push(source)
            if (source === 'first') { started.resolve(); await finish.promise }
            return { svg: source }
        },
    })
    const first = render('first', 'neutral')
    await started.promise
    const controller = new AbortController()
    const canceled = render('canceled', 'neutral', controller.signal)
    const rejected = assert.rejects(canceled, { name: 'AbortError' })
    controller.abort()
    const last = render('last', 'neutral')
    finish.resolve()
    await Promise.all([first, rejected, last])
    assert.deepEqual(rendered, ['first', 'last'])
})
