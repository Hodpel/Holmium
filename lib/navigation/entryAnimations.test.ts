import assert from 'node:assert/strict'
import test from 'node:test'
import { waitForEntryAnimations } from './entryAnimations.ts'

test('waits for the actual header animations, including cancellation, rather than a duration', async () => {
    let finish!: () => void
    let cancel!: () => void
    const animations = [
        { playState: 'running', finished: new Promise<void>(resolve => { finish = resolve }) },
        { playState: 'running', finished: new Promise<void>((_resolve, reject) => { cancel = () => reject(new Error('canceled')) }) },
    ]
    let completed = false
    const header = { getAnimations: () => animations.filter(a => a.playState === 'running') } as unknown as Element
    const pending = waitForEntryAnimations(header, new AbortController().signal).then(() => { completed = true })
    await Promise.resolve()
    assert.equal(completed, false)
    animations[0].playState = 'finished'; finish()
    await Promise.resolve()
    assert.equal(completed, false)
    animations[1].playState = 'idle'; cancel()
    await pending
    assert.equal(completed, true)
})

test('does not wait if no animation exists or the route has been canceled', async () => {
    await waitForEntryAnimations(null, new AbortController().signal)
    const controller = new AbortController()
    controller.abort()
    await waitForEntryAnimations({ getAnimations() { throw new Error('stale route inspected') } } as unknown as Element, controller.signal)
})
