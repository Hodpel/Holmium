import assert from 'node:assert/strict'
import test from 'node:test'

import { recoverCachedImageLoads } from './imageLoadRecovery.ts'

type ImageState = {
    complete: boolean
    naturalWidth: number
    recovered: number
}

function image(complete: boolean, naturalWidth: number): ImageState {
    return { complete, naturalWidth, recovered: 0 }
}

test('recoverCachedImageLoads recovers only successfully cached images', () => {
    const cached = image(true, 1200)
    const pending = image(false, 0)
    const failed = image(true, 0)

    const recovered = recoverCachedImageLoads([cached, pending, failed], (candidate) => {
        candidate.recovered += 1
    })

    assert.equal(recovered, 1)
    assert.equal(cached.recovered, 1)
    assert.equal(pending.recovered, 0)
    assert.equal(failed.recovered, 0)
})
