import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'

import * as scroll from './scroll.ts'

const globalKeys = ['window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame']
const originalDescriptors = new Map(globalKeys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))

afterEach(() => {
    for (const key of globalKeys) {
        const descriptor = originalDescriptors.get(key)
        if (descriptor) Object.defineProperty(globalThis, key, descriptor)
        else delete globalThis[key]
    }
})

test('starts a smooth page-top scroll before navigating', () => {
    const events = []
    globalThis.window = {
        scrollY: 0,
        matchMedia() {
            return { matches: false }
        },
        scrollTo(options) {
            events.push(['scroll', options])
        },
    }

    scroll.navigateToPageTop(() => events.push(['navigate']))

    assert.deepEqual(events, [
        ['scroll', { top: 0, behavior: 'smooth' }],
        ['navigate'],
    ])
})

test('preserves the current scroll range until page-top scrolling finishes', () => {
    const frames = []
    const wrapper = {
        style: {
            minHeight: '',
        },
    }

    globalThis.document = {
        querySelector(selector) {
            assert.equal(selector, '.wrapper')
            return wrapper
        },
    }
    globalThis.requestAnimationFrame = (callback) => {
        frames.push(callback)
        return frames.length
    }
    globalThis.cancelAnimationFrame = () => {}
    globalThis.window = {
        scrollY: 800,
        innerHeight: 600,
        matchMedia() {
            return { matches: false }
        },
        scrollTo() {},
        setTimeout() {
            return 1
        },
        clearTimeout() {},
    }

    scroll.navigateToPageTop(() => {
        assert.equal(wrapper.style.minHeight, '1400px')
    })

    assert.equal(frames.length, 1)
    window.scrollY = 0
    frames.shift()()
    assert.equal(wrapper.style.minHeight, '')
})
