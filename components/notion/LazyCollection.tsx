'use client'

import dynamic from 'next/dynamic'
import { motion, useInView, useReducedMotion } from 'motion/react'
import type {
    CollectionQueryResult,
    CollectionView,
    CollectionViewBlock,
    CollectionViewPageBlock,
    PageBlock,
} from 'notion-types'
import { getBlockCollectionId, getBlockValue, getTextContent } from 'notion-utils'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { NotionContext } from 'react-notion-x'

import type { BoardProps, BoardViewFormat } from '@/components/notion/collection/Board'
import { buildBoardModel } from '@/components/notion/collection/boardModel'
import {
    countCollectionPlaceholderItems,
    estimateBoardTitleLineCount,
    estimateCollectionPlaceholderHeight,
    shouldShowCollectionPlaceholder,
    type CollectionPlaceholderCoverSize,
    type CollectionPlaceholderViewType,
} from '@/lib/notion/collectionPlaceholder'
import { prepareCollectionLoadMoreButtons } from '@/lib/notion/collectionLoadMore'
import locale from '@/lib/locale'
import { usePageEntrance } from '@/components/navigation/PageEntrance'

export type CollectionProps = {
    block: CollectionViewBlock | CollectionViewPageBlock | PageBlock
    className?: string
    ctx: NotionContext
}

type LoadedCollectionProps = CollectionProps & {
    onReady: () => void
}

type CollectionFormat = BoardViewFormat & {
    collection_groups?: Array<{ hidden?: boolean }>
    gallery_cover?: { type?: string }
    gallery_cover_size?: CollectionPlaceholderCoverSize
    gallery_properties?: Array<{ property: string; visible: boolean }>
    inline_collection_first_load_limit?: { limit?: number }
}

const COLLECTION_ITEM_SELECTOR: Record<CollectionPlaceholderViewType, string> = {
    board: '.holmium-board-card',
    gallery: '.notion-gallery-grid > .notion-collection-card',
    list: '.notion-list-body > .notion-list-item',
    table: '.notion-table-body > .notion-table-row',
}

const LazyCollectionRenderer = dynamic<LoadedCollectionProps>(
    () =>
        import('react-notion-x/build/third-party/collection').then((module) => {
            const CollectionRenderer = module.Collection

            function LoadedCollection({ onReady, ...props }: LoadedCollectionProps) {
                useEffect(() => {
                    const frameId = requestAnimationFrame(onReady)
                    return () => cancelAnimationFrame(frameId)
                }, [onReady])
                return <CollectionRenderer {...props} />
            }

            return LoadedCollection
        }),
    { ssr: false },
)

const LazyBoardRenderer = dynamic<BoardProps>(() => import('@/components/notion/collection/Board'), { ssr: false })

export default function LazyCollection(props: CollectionProps) {
    const reduceMotion = useReducedMotion()
    const containerRef = useRef<HTMLDivElement>(null)
    const nearViewport = useInView(containerRef, { once: true, margin: '600px 0px' })
    const { ready: entranceReady } = usePageEntrance()
    const contentRef = useRef<HTMLDivElement>(null)
    const loadMoreFadeAnimationRef = useRef<Animation | null>(null)
    const loadMoreAnimationRef = useRef<Animation | null>(null)
    const [containerWidth, setContainerWidth] = useState(708)
    const [loadMoreTransition, setLoadMoreTransition] = useState<{
        startHeight: number
        visibleItemCount: number
    } | null>(null)
    const [ready, setReady] = useState(false)
    const [revealComplete, setRevealComplete] = useState(false)
    const [placeholderFadeComplete, setPlaceholderFadeComplete] = useState(false)
    const handleReady = useCallback(() => setReady(true), [])
    const prepareLoadMore = useCallback(() => {
        const content = contentRef.current
        if (!content) return
        prepareCollectionLoadMoreButtons(
            content.querySelectorAll<HTMLElement>('.notion-collection-load-more'),
            locale.NOTION.COLLECTION_LOAD_MORE,
        )
    }, [])
    const initialViewId = props.block.type === 'page' ? undefined : props.block.view_ids?.[0]
    const initialView = initialViewId
        ? (getBlockValue(props.ctx.recordMap.collection_view[initialViewId]) as CollectionView | undefined)
        : undefined
    const initialViewType = (initialView?.type ?? 'list') as CollectionPlaceholderViewType
    const collectionId = getBlockCollectionId(props.block, props.ctx.recordMap)
    const collection = collectionId ? getBlockValue(props.ctx.recordMap.collection[collectionId]) : undefined
    const query =
        collectionId && initialViewId
            ? (props.ctx.recordMap.collection_query[collectionId]?.[initialViewId] as CollectionQueryResult | undefined)
            : undefined
    const format = useMemo(() => (initialView?.format ?? {}) as CollectionFormat, [initialView])
    const blockFormat = props.block.format as { hide_inline_collection_name?: boolean } | undefined
    const hasTitle =
        Boolean(collection && getTextContent(collection.name).trim()) &&
        blockFormat?.hide_inline_collection_name !== true &&
        format.hide_linked_collection_name !== true
    const boardModel = useMemo(() => {
        if (initialViewType !== 'board' || !collection || !initialView || !query) return null
        return buildBoardModel({
            collection,
            collectionData: query,
            collectionView: initialView,
            recordMap: props.ctx.recordMap,
            untitledLabel: locale.NOTION.COLLECTION_UNTITLED,
        })
    }, [collection, initialView, initialViewType, props.ctx.recordMap, query])

    useLayoutEffect(() => {
        const container = containerRef.current
        if (!container) return

        const updateWidth = () => setContainerWidth(container.getBoundingClientRect().width || 708)
        updateWidth()

        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(updateWidth)
        observer.observe(container)
        return () => observer.disconnect()
    }, [])

    useEffect(
        () => () => {
            loadMoreFadeAnimationRef.current?.cancel()
            loadMoreAnimationRef.current?.cancel()
        },
        [],
    )

    useLayoutEffect(() => {
        if (!ready) return

        const container = containerRef.current
        const content = contentRef.current
        if (!container || !content) return

        prepareLoadMore()
        const tableView = content.querySelector<HTMLElement>('.notion-table-view')
        if (!tableView) return

        container.style.setProperty('--holmium-collection-content-width', `${tableView.getBoundingClientRect().width}px`)
    }, [prepareLoadMore, ready])

    useLayoutEffect(() => {
        if (!loadMoreTransition) return

        const container = containerRef.current
        const content = contentRef.current
        if (!container || !content) return

        const { startHeight, visibleItemCount } = loadMoreTransition
        const endHeight = container.getBoundingClientRect().height
        const items = Array.from(content.querySelectorAll<HTMLElement>(COLLECTION_ITEM_SELECTOR[initialViewType]))
        const itemKeyframes: Keyframe[] =
            initialViewType === 'gallery'
                ? [{ opacity: 0 }, { opacity: 1 }]
                : [
                      { opacity: 0, transform: 'translateY(-4px)' },
                      { opacity: 1, transform: 'translateY(0)' },
                  ]
        for (const [index, item] of items.slice(visibleItemCount).entries()) {
            item.animate(itemKeyframes, {
                duration: 260,
                delay: Math.min(index * 20, 120),
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                fill: 'backwards',
            })
        }

        if (Math.abs(endHeight - startHeight) < 0.5) return

        container.style.height = `${startHeight}px`
        if (endHeight > startHeight) container.dataset.loadMoreExpanding = 'true'
        const animation = container.animate(
            [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
            { duration: 300, easing: 'cubic-bezier(0, 0, 0.58, 1)' },
        )
        loadMoreAnimationRef.current = animation
        animation.addEventListener(
            'finish',
            () => {
                if (loadMoreAnimationRef.current !== animation) return
                loadMoreAnimationRef.current = null
                container.style.height = 'auto'
                delete container.dataset.loadMoreExpanding
            },
            { once: true },
        )
    }, [initialViewType, loadMoreTransition])

    const estimatedHeight = useMemo(() => {
        const boardCoverSize = format.board_cover_size ?? 'medium'
        return estimateCollectionPlaceholderHeight({
            viewType: initialViewType,
            itemCount: query ? countCollectionPlaceholderItems(query) : 0,
            containerWidth,
            loadLimit: format.inline_collection_first_load_limit?.limit,
            groupCount: format.collection_groups?.filter((group) => !group.hidden).length ?? 0,
            hasTitle,
            viewCount: props.ctx.showCollectionViewDropdown && props.block.type !== 'page' ? props.block.view_ids.length : 1,
            galleryCoverSize: format.gallery_cover_size,
            galleryHasCover: format.gallery_cover?.type !== undefined && format.gallery_cover.type !== 'none',
            visiblePropertyCount: format.gallery_properties?.filter((property) => property.visible).length,
            boardColumns: boardModel?.columns.map((column) => ({
                cards: column.cards.map((card) => {
                    const hasIcon = Boolean(card.block.format?.page_icon)
                    return {
                        hasIcon,
                        titleLineCount: estimateBoardTitleLineCount(card.title, hasIcon, boardCoverSize),
                        visiblePropertyCount: card.properties.length,
                    }
                }),
            })),
            boardCoverSize,
            boardHasCover: format.board_cover?.type !== undefined && format.board_cover.type !== 'none',
        })
    }, [boardModel, containerWidth, format, hasTitle, initialViewType, props.block, props.ctx, query])

    const instantReveal = Boolean(reduceMotion)
    const showPlaceholder = shouldShowCollectionPlaceholder({ ready, instantReveal, placeholderFadeComplete })
    const handleLoadMoreClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (!(event.target instanceof Element)) return
            if (event.target.closest('.notion-collection-view-tabs-content-item')) {
                requestAnimationFrame(prepareLoadMore)
                return
            }
            if (instantReveal) return
            if (!event.target.closest('.notion-collection-load-more')) return

            const container = containerRef.current
            const content = contentRef.current
            if (!container || !content) return

            loadMoreAnimationRef.current?.cancel()
            setLoadMoreTransition({
                startHeight: container.getBoundingClientRect().height,
                visibleItemCount: content.querySelectorAll(COLLECTION_ITEM_SELECTOR[initialViewType]).length,
            })
        },
        [initialViewType, instantReveal, prepareLoadMore],
    )
    const handleLoadMoreKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        if (!(event.target instanceof Element)) return

        const loadMore = event.target.closest<HTMLElement>('.notion-collection-load-more')
        if (!loadMore) return

        event.preventDefault()
        loadMore.click()
    }, [])
    const handleLoadMoreClickCapture = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (instantReveal || !(event.target instanceof Element)) return

            const loadMore = event.target.closest<HTMLElement>('.notion-collection-load-more')
            if (!loadMore) return
            if (loadMore.dataset.holmiumContinueLoadMore === 'true') {
                delete loadMore.dataset.holmiumContinueLoadMore
                return
            }

            event.preventDefault()
            event.stopPropagation()
            loadMore.style.pointerEvents = 'none'
            loadMoreFadeAnimationRef.current?.cancel()

            const animation = loadMore.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: 140,
                easing: 'ease-out',
                fill: 'forwards',
            })
            loadMoreFadeAnimationRef.current = animation
            animation.addEventListener(
                'finish',
                () => {
                    if (loadMoreFadeAnimationRef.current !== animation) return
                    loadMoreFadeAnimationRef.current = null
                    loadMore.dataset.holmiumContinueLoadMore = 'true'
                    loadMore.style.pointerEvents = ''
                    loadMore.click()
                },
                { once: true },
            )
        },
        [instantReveal],
    )

    return (
        <motion.div
            ref={containerRef}
            className="holmium-collection-loader"
            data-view-type={initialViewType}
            data-ready={ready}
            data-reveal-complete={instantReveal || revealComplete}
            aria-busy={!ready}
            initial={false}
            onClickCapture={handleLoadMoreClickCapture}
            onClick={handleLoadMoreClick}
            onKeyDown={handleLoadMoreKeyDown}
            animate={{ height: ready ? 'auto' : estimatedHeight }}
            transition={{ duration: instantReveal ? 0 : 0.3, ease: 'easeOut' }}
            onAnimationComplete={() => {
                if (ready) setRevealComplete(true)
            }}
        >
            <motion.div
                ref={contentRef}
                className="holmium-collection-content"
                initial={false}
                animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 4 }}
                transition={{ duration: instantReveal ? 0 : 0.3, ease: 'easeOut' }}
            >
                {nearViewport && entranceReady && (initialViewType === 'board' && props.block.type !== 'page' ? (
                    <LazyBoardRenderer
                        block={props.block}
                        collection={collection}
                        collectionView={initialView}
                        ctx={props.ctx}
                        model={boardModel}
                        onReady={handleReady}
                    />
                ) : (
                    <LazyCollectionRenderer {...props} onReady={handleReady} />
                ))}
            </motion.div>
            {showPlaceholder ? (
                <motion.div
                    className="holmium-collection-placeholder"
                    aria-hidden="true"
                    initial={false}
                    animate={{ opacity: ready ? 0 : 1 }}
                    transition={{ duration: instantReveal ? 0 : 0.3, ease: 'easeOut' }}
                    onAnimationComplete={() => {
                        if (ready) setPlaceholderFadeComplete(true)
                    }}
                />
            ) : null}
        </motion.div>
    )
}
