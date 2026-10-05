import assert from 'node:assert/strict'
import test from 'node:test'

import { startTabPanelExit, startTabPanelTransition } from './tabTransition.ts'

test('finishes the outgoing panel before activating the next tab', () => {
    const exits: Array<() => void> = []
    const delays: number[] = []
    const activations: string[] = []
    const panel = { dataset: {} as DOMStringMap } as HTMLElement

    startTabPanelExit(panel, () => activations.push('next'), {
        clearExit: () => undefined,
        scheduleExit: (callback, delay) => {
            exits.push(callback)
            delays.push(delay)
            return exits.length
        },
    })

    assert.equal(panel.dataset.holmiumTabContentExiting, 'true')
    assert.deepEqual(delays, [100])
    assert.deepEqual(activations, [])

    exits[0]?.()

    assert.equal(panel.dataset.holmiumTabContentExiting, undefined)
    assert.deepEqual(activations, ['next'])
})

test('animates a tab panel from its rendered height to the incoming content height', () => {
    const frames: FrameRequestCallback[] = []
    const cleanups: Array<() => void> = []
    const cleanupDelays: number[] = []
    const style = { height: '' }
    const panel = {
        dataset: {} as DOMStringMap,
        getBoundingClientRect: () => ({ height: style.height ? Number.parseFloat(style.height) : 248 }),
        style,
    } as unknown as HTMLElement

    startTabPanelTransition(panel, 132, {
        cancelFrame: () => undefined,
        clearCleanup: () => undefined,
        requestFrame: (callback) => {
            frames.push(callback)
            return frames.length
        },
        scheduleCleanup: (callback, delay) => {
            cleanups.push(callback)
            cleanupDelays.push(delay)
            return cleanups.length
        },
    })

    assert.equal(panel.style.height, '132px')
    assert.equal(panel.dataset.holmiumTabTransition, 'true')

    frames[0]?.(0)

    assert.equal(panel.style.height, '248px')
    assert.equal(panel.dataset.holmiumTabContentEntering, 'true')
    assert.deepEqual(cleanupDelays, [300])

    cleanups[0]?.()

    assert.equal(panel.style.height, '')
    assert.equal(panel.dataset.holmiumTabTransition, undefined)
    assert.equal(panel.dataset.holmiumTabContentEntering, undefined)
})

test('measures the incoming panel at its natural height before shrinking', () => {
    const frames: FrameRequestCallback[] = []
    const style = { height: '' }
    const panel = {
        dataset: {} as DOMStringMap,
        getBoundingClientRect: () => ({ height: style.height ? Number.parseFloat(style.height) : 84 }),
        scrollHeight: 196,
        style,
    } as unknown as HTMLElement

    startTabPanelTransition(panel, 196, {
        cancelFrame: () => undefined,
        clearCleanup: () => undefined,
        requestFrame: (callback) => {
            frames.push(callback)
            return frames.length
        },
        scheduleCleanup: () => 1,
    })

    frames[0]?.(0)

    assert.equal(panel.style.height, '84px')
})
