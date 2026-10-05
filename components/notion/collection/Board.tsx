'use client'

import React from 'react'
import type {
    Block,
    Collection,
    CollectionView,
    CollectionViewBlock,
    CollectionViewPageBlock,
} from 'notion-types'
import { getBlockValue, getTextContent, normalizeUrl } from 'notion-utils'
import { NotionContextProvider, PageIcon, type NotionContext } from 'react-notion-x'
import { Property } from 'react-notion-x/build/third-party/collection'

import locale from '@/lib/locale'
import { recoverCachedImageLoads } from '@/lib/notion/imageLoadRecovery'
import { getBoardPageProperties, type BoardCardModel, type BoardModel } from './boardModel'

/**
 * Temporary compatibility renderer for current Notion Status Board payloads.
 * Remove this component, boardModel, and their Holmium styles once an upgraded
 * react-notion-x handles `board_columns_by` and `defaultOption` correctly.
 */
export type BoardProps = {
    block: CollectionViewBlock | CollectionViewPageBlock
    collection: Collection | undefined
    collectionView: CollectionView | undefined
    ctx: NotionContext
    model: BoardModel | null
    onReady: () => void
}

export type BoardCardCover = {
    property?: string
    type?: 'none' | 'page_cover' | 'page_content' | 'page_content_first' | 'property'
}

export type BoardViewFormat = {
    board_cover?: BoardCardCover
    board_cover_aspect?: 'contain' | 'cover'
    board_cover_size?: 'small' | 'medium' | 'large'
    board_properties?: Array<{ property: string; visible: boolean }>
    hide_linked_collection_name?: boolean
}

function BoardPropertyLink({ children, href }: React.ComponentProps<'a'>) {
    const child = React.isValidElement<{ children?: React.ReactNode }>(children) ? children.props.children : children
    const label = typeof child === 'string' ? child : href

    return (
        <form action={href} target="_blank">
            <input className="nested-form-link notion-link" type="submit" value={label} />
        </form>
    )
}

function BoardPropertyPageLink({ children, className, title }: React.ComponentProps<'a'>) {
    return (
        <span className={className} title={title}>
            {children}
        </span>
    )
}

function getCoverSource(
    card: BoardCardModel,
    cover: BoardCardCover,
    recordMap: NotionContext['recordMap'],
): { block: Block; source: string } | null {
    if (cover.type === 'page_cover' && card.block.format?.page_cover) {
        return { block: card.block, source: card.block.format.page_cover }
    }

    if (cover.type === 'page_content' || cover.type === 'page_content_first') {
        for (const blockId of card.block.content || []) {
            const block = getBlockValue(recordMap.block[blockId])
            if (block?.type !== 'image') continue
            const source = block.properties?.source?.[0]?.[0] || block.format?.display_source
            if (source) return { block, source }
        }
    }

    if (cover.type === 'property' && cover.property) {
        const data = getBoardPageProperties(card.block)[cover.property]
        const source = data?.[0]?.[1]?.find((decoration) => decoration[0] === 'a')?.[1]
        if (typeof source === 'string') return { block: card.block, source }
    }

    return null
}

function BoardCoverImage({
    alt,
    ctx,
    objectFit,
    src,
}: {
    alt: string
    ctx: NotionContext
    objectFit: React.CSSProperties['objectFit']
    src: string
}) {
    const [loadedSrc, setLoadedSrc] = React.useState<string | null>(null)
    const recoverLoadedImage = React.useCallback(
        (image: HTMLImageElement | null) => {
            if (!image) return
            recoverCachedImageLoads([image], () => setLoadedSrc(src))
        },
        [src],
    )
    const previewImage = ctx.previewImages
        ? ctx.recordMap.preview_images?.[src] || ctx.recordMap.preview_images?.[normalizeUrl(src)]
        : null

    if (!previewImage) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img alt={alt} decoding="async" loading="lazy" src={src} style={{ objectFit }} />
    }

    const isLoaded = loadedSrc === src
    return (
        <div className={`holmium-progressive-image${isLoaded ? ' holmium-progressive-image-loaded' : ''}`}>
            {/* The generated preview is decorative; the real image owns the accessible label. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" aria-hidden="true" className="holmium-progressive-image-preview" decoding="async" src={previewImage.dataURIBase64} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                alt={alt}
                className="holmium-progressive-image-real"
                decoding="async"
                loading="lazy"
                onLoad={() => setLoadedSrc(src)}
                ref={recoverLoadedImage}
                src={src}
                style={{ objectFit }}
            />
        </div>
    )
}

function BoardCard({
    card,
    collection,
    ctx,
    format,
}: {
    card: BoardCardModel
    collection: Collection
    ctx: NotionContext
    format: BoardViewFormat
}) {
    const PageLink = ctx.components.PageLink
    const cover = format.board_cover || { type: 'none' }
    const coverSource = getCoverSource(card, cover, ctx.recordMap)
    const coverUrl = coverSource ? ctx.mapImageUrl(coverSource.source, coverSource.block) : undefined

    return (
        <PageLink className="holmium-board-card" href={ctx.mapPageUrl(card.id)}>
            {cover.type !== 'none' && (
                <div className="holmium-board-card-cover">
                    {coverUrl ? (
                        <BoardCoverImage
                            alt=""
                            ctx={ctx}
                            objectFit={format.board_cover_aspect || 'cover'}
                            src={coverUrl}
                        />
                    ) : null}
                </div>
            )}

            <div className="holmium-board-card-body">
                <div className="holmium-board-card-title">
                    <PageIcon block={card.block} hideDefaultIcon />
                    <span>{card.title}</span>
                </div>

                {card.properties.map(({ data, id, schema }) => (
                    <div className="holmium-board-card-property" key={id}>
                        <Property block={card.block} collection={collection} data={data} inline schema={schema} />
                    </div>
                ))}
            </div>
        </PageLink>
    )
}

export default function Board({ block, collection, collectionView, ctx, model, onReady }: BoardProps) {
    React.useEffect(() => {
        const frameId = requestAnimationFrame(onReady)
        return () => cancelAnimationFrame(frameId)
    }, [onReady])

    if (!collection || !collectionView || !model) {
        const message =
            !collection || !collectionView
                ? locale.NOTION.COLLECTION_UNAVAILABLE
                : locale.NOTION.COLLECTION_UNSUPPORTED.replace('{view}', 'Board')

        return (
            <div className="notion-collection notion-collection-fallback" role="status">
                {message}
            </div>
        )
    }

    const format = collectionView.format as BoardViewFormat
    const title = getTextContent(collection.name).trim()
    const blockFormat = block.format as { hide_inline_collection_name?: boolean } | undefined
    const showTitle =
        blockFormat?.hide_inline_collection_name !== true &&
        format.hide_linked_collection_name !== true &&
        Boolean(title)
    const titleBlock: Block = collection.icon
        ? ({ ...block, format: { ...block.format, page_icon: collection.icon } } as Block)
        : block
    const size = format.board_cover_size || 'medium'
    const trackStyle = {
        '--holmium-board-column-count': Math.max(1, model.columns.length),
    } as React.CSSProperties
    const propertyComponents = {
        ...ctx.components,
        Link: BoardPropertyLink,
        PageLink: BoardPropertyPageLink,
    }

    return (
        <NotionContextProvider {...ctx} components={propertyComponents}>
            <div className={`notion-collection holmium-board holmium-board-size-${size}`}>
                <div className="holmium-board-track" style={trackStyle}>
                    {showTitle && (
                        <div className="notion-collection-header">
                            <div className="notion-collection-header-title">
                                <PageIcon block={titleBlock} className="notion-page-title-icon" hideDefaultIcon />
                                {title}
                            </div>
                        </div>
                    )}
                    {model.columns.map((column) => (
                        <section className="holmium-board-column" data-color={column.color} key={column.id}>
                            <header className="holmium-board-column-header">
                                <span className="holmium-board-column-status">
                                    <span aria-hidden="true" className="holmium-board-column-dot" />
                                    {column.name || locale.NOTION.COLLECTION_NO_STATUS}
                                </span>
                                <span className="holmium-board-column-count">{column.cards.length}</span>
                            </header>

                            <div className="holmium-board-column-cards">
                                {column.cards.map((card) => (
                                    <BoardCard
                                        card={card}
                                        collection={collection}
                                        ctx={ctx}
                                        format={format}
                                        key={card.id}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </NotionContextProvider>
    )
}
