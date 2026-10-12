import assert from 'node:assert/strict'
import test from 'node:test'
import * as api from './mediaFrame.ts'

test('playing only arms a real frame callback and cleanup fences late frame delivery', () => {
    assert.ok(api)
    const captured: { callback?: VideoFrameRequestCallback } = {}
    let cancelled = 0, presented = 0
    const target = Object.assign(new EventTarget(), {
        requestVideoFrameCallback(value: VideoFrameRequestCallback) { captured.callback = value; return 1 },
        cancelVideoFrameCallback() { cancelled++ },
    })
    const dispose = api.watchFirstFrame(target, () => { presented++ })
    target.dispatchEvent(new Event('loadedmetadata'))
    assert.equal(presented, 0)
    assert.equal(Boolean(captured.callback), false)
    target.dispatchEvent(new Event('playing'))
    assert.equal(presented, 0)
    assert.ok(captured.callback)
    captured.callback(0, {} as VideoFrameCallbackMetadata)
    captured.callback(0, {} as VideoFrameCallbackMetadata)
    assert.equal(presented, 1)
    dispose()
    assert.equal(cancelled, 0)
    const second = api.watchFirstFrame(target, () => { presented++ })
    target.dispatchEvent(new Event('playing'))
    second()
    captured.callback(0, {} as VideoFrameCallbackMetadata)
    assert.equal(presented, 1)
    assert.equal(cancelled, 1)
})

test('failed frame capture preserves the previous retained frame rather than clearing it', () => {
    assert.ok(api)
    const capture = (api as unknown as { retainVideoFrame?: (video: unknown, canvas: unknown) => boolean }).retainVideoFrame
    assert.ok(capture)
    const previous: { width: number; height: number; getContext(): { drawImage(): void }; ownerDocument: { createElement(): { getContext(): { drawImage(): void } | null } } } = { width: 640, height: 360, getContext: () => ({ drawImage() {} }), ownerDocument: { createElement: () => ({ getContext: () => null }) } }
    assert.equal(capture({ readyState: 2, videoWidth: 1280, videoHeight: 720 }, previous), false)
    assert.equal(previous.width, 640)
    const throwing = { getContext: () => ({ drawImage() { throw new Error('no decoded frame') } }) }
    previous.ownerDocument.createElement = () => throwing
    assert.equal(capture({ readyState: 2, videoWidth: 1280, videoHeight: 720 }, previous), false)
    assert.equal(previous.width, 640)
})

test('play binding deduplicates pending intent and disposal rejects late events', async () => {
    assert.ok(api)
    const bind = (api as unknown as { bindFilePlayback?: (target: unknown, options: unknown) => { play(): Promise<void>; dispose(): void } }).bindFilePlayback
    assert.ok(bind)
    let resolvePlay: (() => void) | undefined
    let plays = 0, pauses = 0, frames = 0
    const callback: { frame?: VideoFrameRequestCallback } = {}
    const target = Object.assign(new EventTarget(), {
        error: null,
        play() { plays++; return new Promise<void>(resolve => { resolvePlay = resolve }) },
        pause() { pauses++ },
        requestVideoFrameCallback(value: VideoFrameRequestCallback) { callback.frame = value; return 1 },
        cancelVideoFrameCallback() {},
    })
    const binding = bind(target, { kind: 'video', onFramePresented() { frames++ }, onFailure() { assert.fail('unexpected failure') }, frozenFrame: null, onFrozenChange() {} })
    const first = binding.play(), second = binding.play()
    assert.equal(plays, 1)
    target.dispatchEvent(new Event('playing'))
    assert.equal(frames, 0)
    assert.ok(callback.frame)
    binding.dispose()
    callback.frame(0, {} as VideoFrameCallbackMetadata)
    assert.equal(frames, 0)
    assert.equal(pauses, 1)
    assert.ok(resolvePlay)
    resolvePlay()
    await Promise.all([first, second])
})

test('browser play refusal reports activation without resetting the media source', async () => {
    assert.ok(api)
    const bind = (api as unknown as { bindFilePlayback?: (target: unknown, options: unknown) => { play(): Promise<void>; dispose(): void } }).bindFilePlayback
    assert.ok(bind)
    const failures: string[] = []
    let loads = 0
    const target = Object.assign(new EventTarget(), { error: null, load() { loads++ }, pause() {}, play: () => Promise.reject(new DOMException('gesture required', 'NotAllowedError')) })
    const binding = bind(target, { kind: 'audio', onFramePresented() {}, onFailure(reason: string) { failures.push(reason) }, frozenFrame: null, onFrozenChange() {} })
    await binding.play()
    assert.deepEqual(failures, ['activation'])
    assert.equal(loads, 0)
    binding.dispose()
})

test('source failure invalidates the pending frame even if its callback is already queued', () => {
    assert.ok(api)
    let frame: VideoFrameRequestCallback | undefined, presented = 0
    const target = Object.assign(new EventTarget(), { error: null, pause() {}, play: async () => {}, requestVideoFrameCallback(callback: VideoFrameRequestCallback) { frame = callback; return 1 }, cancelVideoFrameCallback() {} })
    const binding = api.bindFilePlayback(target as unknown as HTMLVideoElement, { kind: 'video', frozenFrame: null, onFrozenChange() {}, onFailure() {}, onFramePresented() { presented++ } })
    target.dispatchEvent(new Event('playing'))
    const stale = frame!
    target.dispatchEvent(new Event('error'))
    stale(0, {} as VideoFrameCallbackMetadata)
    assert.equal(presented, 0)
    binding.dispose()
})

test('audio can retry after previously playing without requiring a video snapshot', async () => {
    assert.ok(api)
    let loads = 0, plays = 0
    const target = Object.assign(new EventTarget(), { error: null as MediaError | null, pause() {}, load() { loads++ }, play: async () => { plays++ } })
    const binding = api.bindFilePlayback(target as unknown as HTMLAudioElement, { kind: 'audio', frozenFrame: null, onFrozenChange() {}, onFailure() {}, onFramePresented() {} })
    target.dispatchEvent(new Event('playing'))
    target.error = { code: 2 } as MediaError
    await binding.play()
    assert.equal(loads, 1)
    assert.equal(plays, 1)
    binding.dispose()
})

test('legacy frame fallback requires drawable data and a paint boundary, and is cancellable', () => {
    assert.ok(api)
    let callback: FrameRequestCallback | undefined, presented = 0, draws = 0
    const target = Object.assign(new EventTarget(), {
        readyState: 1, videoWidth: 640, videoHeight: 360, error: null,
        ownerDocument: {
            defaultView: { requestAnimationFrame(value: FrameRequestCallback) { callback = value; return 1 }, cancelAnimationFrame() {} },
            createElement: () => ({ getContext: () => ({ drawImage() { draws++ } }) }),
        },
    })
    const stop = api.watchDecodedFrame(target as unknown as HTMLVideoElement, () => { presented++ })
    target.dispatchEvent(new Event('loadedmetadata'))
    assert.equal(callback, undefined)
    target.dispatchEvent(new Event('playing'))
    callback!(0)
    assert.equal(draws, 0)
    target.readyState = 2
    target.dispatchEvent(new Event('loadeddata'))
    callback!(0)
    assert.equal(draws, 1)
    assert.equal(presented, 0)
    const late = callback!
    stop(); late(0)
    assert.equal(presented, 0)
    const second = api.watchDecodedFrame(target as unknown as HTMLVideoElement, () => { presented++ })
    target.dispatchEvent(new Event('playing'))
    callback!(0); callback!(0)
    assert.equal(presented, 1)
    second()
})
