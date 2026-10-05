export type CollectionPlaceholderViewType = 'table' | 'gallery' | 'list' | 'board'
export type CollectionPlaceholderCoverSize = 'small' | 'medium' | 'large'

export interface CollectionPlaceholderBoardCard {
    hasIcon?: boolean
    titleLineCount?: number
    visiblePropertyCount?: number
}

export interface CollectionPlaceholderBoardColumn {
    cards: CollectionPlaceholderBoardCard[]
}

export interface CollectionPlaceholderOptions {
    viewType: CollectionPlaceholderViewType
    itemCount: number
    containerWidth: number
    loadLimit?: number
    groupCount?: number
    hasTitle?: boolean
    viewCount?: number
    galleryCoverSize?: CollectionPlaceholderCoverSize
    galleryHasCover?: boolean
    visiblePropertyCount?: number
    boardColumns?: CollectionPlaceholderBoardColumn[]
    boardCoverSize?: CollectionPlaceholderCoverSize
    boardHasCover?: boolean
}

export interface CollectionPlaceholderVisibility {
    ready: boolean
    instantReveal: boolean
    placeholderFadeComplete: boolean
}

export function shouldShowCollectionPlaceholder({
    ready,
    instantReveal,
    placeholderFadeComplete,
}: CollectionPlaceholderVisibility): boolean {
    return !ready || (!instantReveal && !placeholderFadeComplete)
}

const MIN_PLACEHOLDER_HEIGHT = 112
const COLLECTION_TITLE_HEIGHT = 42
const COLLECTION_TABS_HEIGHT = 39
const COLLECTION_LOAD_MORE_HEIGHT = 64
const COLLECTION_GROUP_HEIGHT = 36
const COLLECTION_VERTICAL_PADDING = 6
const TABLE_HEADER_HEIGHT = 34
// Link 30px + margins 2px + symmetric cell padding 12px + row border 1px.
const TABLE_ROW_HEIGHT = 45
const LIST_FRAME_HEIGHT = 9
const LIST_ROW_HEIGHT = 32
const GALLERY_VERTICAL_PADDING = 20
const GALLERY_BORDER_HEIGHT = 1
const GALLERY_TITLE_HEIGHT = 38
const GALLERY_PROPERTY_HEIGHT = 28
const GALLERY_GAP = 16
const BOARD_VERTICAL_PADDING = 12
const BOARD_COLUMN_FRAME_HEIGHT = 40
const BOARD_CARD_GAP = 8
const BOARD_CARD_BORDER_HEIGHT = 2
const BOARD_CARD_BODY_PADDING = 12
const BOARD_CARD_TITLE_LINE_HEIGHT = 18.40625
const BOARD_CARD_ICON_HEIGHT = 20
const BOARD_CARD_PROPERTY_HEIGHT = 25.6
const BOARD_TITLE_CONTENT_WIDTH = {
    small: 170,
    medium: 230,
    large: 290,
}

export function estimateBoardTitleLineCount(
    title: string,
    hasIcon: boolean,
    size: CollectionPlaceholderCoverSize,
): number {
    const availableWidth = BOARD_TITLE_CONTENT_WIDTH[size] - (hasIcon ? 27.2 : 0)
    const textWidth = Array.from(title).reduce((width, character) => width + (character.charCodeAt(0) > 255 ? 13 : 7), 0)
    return Math.max(1, Math.ceil(textWidth / availableWidth))
}

type CollectionQueryRows = {
    blockIds?: string[]
    collection_group_results?: { blockIds?: string[] }
    [key: string]: unknown
}

function normalizeHeight(height: number, minimumHeight = MIN_PLACEHOLDER_HEIGHT): number {
    return Math.round(Math.max(minimumHeight, height))
}

export function countCollectionPlaceholderItems(query: object): number {
    const rows = query as CollectionQueryRows
    const blockIds = new Set<string>([...(rows.blockIds ?? []), ...(rows.collection_group_results?.blockIds ?? [])])

    for (const [key, value] of Object.entries(rows)) {
        if (!key.startsWith('results:') || !value || typeof value !== 'object') continue

        const groupedBlockIds = (value as { blockIds?: unknown }).blockIds
        if (!Array.isArray(groupedBlockIds)) continue
        for (const blockId of groupedBlockIds) {
            if (typeof blockId === 'string') blockIds.add(blockId)
        }
    }

    return blockIds.size
}

export function estimateCollectionPlaceholderHeight(options: CollectionPlaceholderOptions): number {
    const totalItems = Math.max(0, options.itemCount)
    const visibleItems =
        typeof options.loadLimit === 'number' ? Math.min(totalItems, Math.max(0, options.loadLimit)) : totalItems
    const showLoadMore = visibleItems < totalItems
    const chromeHeight =
        (options.hasTitle ? COLLECTION_TITLE_HEIGHT : 0) +
        ((options.viewCount ?? 1) > 1 ? COLLECTION_TABS_HEIGHT : 0) +
        (options.groupCount ?? 0) * COLLECTION_GROUP_HEIGHT +
        (showLoadMore ? COLLECTION_LOAD_MORE_HEIGHT : 0)

    if (options.viewType === 'board') {
        const coverHeight = options.boardHasCover
            ? { small: 96, medium: 136, large: 176 }[options.boardCoverSize ?? 'medium']
            : 0
        const tallestColumnHeight = Math.max(
            0,
            ...(options.boardColumns ?? []).map(({ cards }) =>
                cards.reduce(
                    (height, card, index) =>
                        height +
                        (index > 0 ? BOARD_CARD_GAP : 0) +
                        BOARD_CARD_BORDER_HEIGHT +
                        coverHeight +
                        BOARD_CARD_BODY_PADDING +
                        Math.max(
                            Math.max(1, card.titleLineCount ?? 1) * BOARD_CARD_TITLE_LINE_HEIGHT,
                            card.hasIcon ? BOARD_CARD_ICON_HEIGHT : 0,
                        ) +
                        Math.max(0, card.visiblePropertyCount ?? 0) * BOARD_CARD_PROPERTY_HEIGHT,
                    BOARD_COLUMN_FRAME_HEIGHT,
                ),
            ),
        )

        return normalizeHeight(
            (options.hasTitle ? COLLECTION_TITLE_HEIGHT : 0) + BOARD_VERTICAL_PADDING + tallestColumnHeight,
            options.boardColumns ? 0 : MIN_PLACEHOLDER_HEIGHT,
        )
    }

    if (options.viewType === 'table') {
        const tableFrameHeight = COLLECTION_VERTICAL_PADDING + TABLE_HEADER_HEIGHT
        return normalizeHeight(chromeHeight + tableFrameHeight + visibleItems * TABLE_ROW_HEIGHT, tableFrameHeight)
    }

    if (options.viewType === 'list') {
        return normalizeHeight(
            chromeHeight + COLLECTION_VERTICAL_PADDING + LIST_FRAME_HEIGHT + visibleItems * LIST_ROW_HEIGHT,
            0,
        )
    }

    const minimumCardWidth = {
        small: 180,
        medium: 260,
        large: 320,
    }[options.galleryCoverSize ?? 'medium']
    const columnCount = Math.max(
        1,
        Math.floor((Math.max(0, options.containerWidth) + GALLERY_GAP) / (minimumCardWidth + GALLERY_GAP)),
    )
    const rowCount = Math.ceil(visibleItems / columnCount)
    const coverHeight = options.galleryHasCover ? (options.galleryCoverSize === 'small' ? 124 : 190) : 0
    const propertyCount = Math.max(1, options.visiblePropertyCount ?? 1)
    const cardHeight = coverHeight + GALLERY_TITLE_HEIGHT + (propertyCount - 1) * GALLERY_PROPERTY_HEIGHT
    const galleryHeight =
        GALLERY_VERTICAL_PADDING +
        GALLERY_BORDER_HEIGHT +
        rowCount * cardHeight +
        Math.max(0, rowCount - 1) * GALLERY_GAP

    return normalizeHeight(chromeHeight + COLLECTION_VERTICAL_PADDING + galleryHeight)
}
