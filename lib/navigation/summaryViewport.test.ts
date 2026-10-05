import assert from 'node:assert/strict'
import test from 'node:test'
import { getSummaryViewport } from './summaryViewport.ts'

test('limits collapsed summaries to three lines without stretching short summaries', () => {
    assert.deepEqual(getSummaryViewport(54, 32, false), {
        canExpand: false,
        collapsedHeight: 54,
        targetHeight: 54,
    })
    assert.deepEqual(getSummaryViewport(160, 32, false), {
        canExpand: true,
        collapsedHeight: 96,
        targetHeight: 96,
    })
})

test('uses the full measured height when expanded', () => {
    assert.deepEqual(getSummaryViewport(160, 32, true), {
        canExpand: true,
        collapsedHeight: 96,
        targetHeight: 160,
    })
})
