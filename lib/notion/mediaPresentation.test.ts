import assert from 'node:assert/strict'
import test from 'node:test'

import { reduceMediaPresentation } from './mediaPresentation.ts'

test('poster and frame progress never regress during preparation, error or retry', () => {
    const initial = { surface: 'preview', error: false } as const
    const poster = reduceMediaPresentation(initial, 'poster-decoded')
    assert.equal(poster.surface, 'poster')
    assert.deepEqual(reduceMediaPresentation(poster, 'retry'), poster)
    const frame = reduceMediaPresentation(poster, 'frame-presented')
    assert.equal(frame.surface, 'frame')
    assert.equal(reduceMediaPresentation(frame, 'poster-decoded').surface, 'frame')
    const failed = reduceMediaPresentation(frame, 'error')
    assert.equal(failed.surface, 'frame')
    assert.equal(failed.error, true)
    assert.deepEqual(reduceMediaPresentation(failed, 'retry'), frame)
    assert.equal(reduceMediaPresentation(initial, 'frame-presented').surface, 'frame')
})
