import assert from 'node:assert/strict'
import test from 'node:test'

import {
    countCollectionPlaceholderItems,
    estimateBoardTitleLineCount,
    estimateCollectionPlaceholderHeight,
    shouldShowCollectionPlaceholder,
} from './collectionPlaceholder.ts'

test('collection placeholder remains mounted until its own fade completes', () => {
    assert.equal(
        shouldShowCollectionPlaceholder({ ready: true, instantReveal: false, placeholderFadeComplete: false }),
        true,
    )
    assert.equal(
        shouldShowCollectionPlaceholder({ ready: true, instantReveal: false, placeholderFadeComplete: true }),
        false,
    )
    assert.equal(
        shouldShowCollectionPlaceholder({ ready: true, instantReveal: true, placeholderFadeComplete: false }),
        false,
    )
})

test('table placeholder preserves its full deterministic height without a scrollbar estimate', () => {
    const oneRowTable = estimateCollectionPlaceholderHeight({
        viewType: 'table',
        itemCount: 1,
        containerWidth: 708,
    })
    const eightRowTable = estimateCollectionPlaceholderHeight({
        viewType: 'table',
        itemCount: 8,
        containerWidth: 930,
    })
    const twentyRowTable = estimateCollectionPlaceholderHeight({
        viewType: 'table',
        itemCount: 20,
        containerWidth: 930,
    })

    assert.equal(oneRowTable, 85)
    assert.equal(eightRowTable, 400)
    assert.equal(twentyRowTable, 940)
})

test('gallery placeholder follows its column count without truncating the estimated height', () => {
    const narrowGallery = estimateCollectionPlaceholderHeight({
        viewType: 'gallery',
        itemCount: 6,
        containerWidth: 560,
        galleryCoverSize: 'medium',
        galleryHasCover: true,
        visiblePropertyCount: 2,
    })
    const wideGallery = estimateCollectionPlaceholderHeight({
        viewType: 'gallery',
        itemCount: 6,
        containerWidth: 1100,
        galleryCoverSize: 'medium',
        galleryHasCover: true,
        visiblePropertyCount: 2,
    })
    assert.ok(wideGallery < narrowGallery)
})

test('gallery placeholder matches measured card heights without displayed properties', () => {
    const estimate = (itemCount: number, galleryCoverSize: 'small' | 'medium' | 'large') =>
        estimateCollectionPlaceholderHeight({
            viewType: 'gallery',
            itemCount,
            containerWidth: 640,
            galleryCoverSize,
            galleryHasCover: true,
            visiblePropertyCount: 1,
        })

    assert.deepEqual([estimate(2, 'medium'), estimate(5, 'small'), estimate(7, 'large')], [255, 367, 1719])
})

test('gallery placeholder includes the normalized height of each displayed property', () => {
    const height = estimateCollectionPlaceholderHeight({
        viewType: 'gallery',
        itemCount: 1,
        containerWidth: 640,
        hasTitle: true,
        galleryCoverSize: 'medium',
        galleryHasCover: true,
        visiblePropertyCount: 11,
    })

    assert.equal(height, 577)
})

test('first-load limits include the measured load-more area after the initially rendered list rows', () => {
    const limited = estimateCollectionPlaceholderHeight({
        viewType: 'list',
        itemCount: 100,
        loadLimit: 10,
        containerWidth: 708,
        hasTitle: true,
    })
    const unlimited = estimateCollectionPlaceholderHeight({
        viewType: 'list',
        itemCount: 100,
        containerWidth: 708,
    })

    assert.equal(limited, 441)
    assert.equal(unlimited, 3215)
})

test('list placeholder matches the measured six-row height', () => {
    const height = estimateCollectionPlaceholderHeight({
        viewType: 'list',
        itemCount: 6,
        containerWidth: 640,
    })

    assert.equal(height, 207)
})

test('short list placeholders use their calculated height without the shared minimum', () => {
    const height = estimateCollectionPlaceholderHeight({
        viewType: 'list',
        itemCount: 1,
        containerWidth: 640,
        hasTitle: true,
    })

    assert.equal(height, 89)
})

test('board placeholder matches the measured two-card tallest column', () => {
    const height = estimateCollectionPlaceholderHeight({
        viewType: 'board',
        itemCount: 4,
        containerWidth: 930,
        boardColumns: [
            { cards: [{}, {}] },
            { cards: [{}] },
            { cards: [{}] },
        ],
    })

    assert.equal(height, 125)
})

test('board placeholder includes its title and measured eight-card tallest column', () => {
    const height = estimateCollectionPlaceholderHeight({
        viewType: 'board',
        itemCount: 10,
        containerWidth: 930,
        hasTitle: true,
        boardColumns: [
            { cards: Array.from({ length: 8 }, () => ({})) },
            { cards: [{}] },
            { cards: [{}] },
        ],
    })

    assert.equal(height, 409)
})

test('board placeholder includes the normalized height of each displayed property', () => {
    const height = estimateCollectionPlaceholderHeight({
        viewType: 'board',
        itemCount: 1,
        containerWidth: 930,
        boardColumns: [
            {
                cards: [{ visiblePropertyCount: 3 }],
            },
        ],
    })

    assert.equal(height, 161)
})

test('board title line estimate accounts for column width and icon space', () => {
    assert.equal(estimateBoardTitleLineCount('a'.repeat(32), false, 'medium'), 1)
    assert.equal(estimateBoardTitleLineCount('a'.repeat(33), false, 'medium'), 2)
    assert.equal(estimateBoardTitleLineCount('a'.repeat(29), true, 'medium'), 2)
    assert.equal(estimateBoardTitleLineCount('一'.repeat(18), false, 'medium'), 2)
})

test('board placeholder keeps a usable fallback height when its model is unavailable', () => {
    assert.equal(
        estimateCollectionPlaceholderHeight({
            viewType: 'board',
            itemCount: 0,
            containerWidth: 640,
        }),
        112,
    )
})

test('grouped collection estimates count unique rows across query groups', () => {
    const itemCount = countCollectionPlaceholderItems({
        blockIds: ['page-a'],
        'results:select:todo': { blockIds: ['page-a', 'page-b'] },
        'results:select:done': { blockIds: ['page-c'] },
    })

    assert.equal(itemCount, 3)
})
