import { getBlockValue, getSignedFileUrl, normalizeUrl, uuidToId } from 'notion-utils'
import type { Block, ExtendedRecordMap } from 'notion-types'

export type MapImageUrl = (url: string | undefined, block: Block) => string | undefined
export const VIDEO_PREVIEW_MAX_DIMENSION = 32

type VideoBlockFormat = NonNullable<Block['format']> & {
    video_thumbnail?: string
}

export type VideoPreviewDescriptor = {
    blockId: string
    width: number
    height: number
    dataURIBase64: string
    thumbnailUrl: string
}

export function getVideoThumbnailSource(block: Block): string | undefined {
    if (block.type !== 'video') return undefined
    return (block.format as VideoBlockFormat | undefined)?.video_thumbnail
}

export function resolvePreviewImageUrl(
    source: string,
    block: Block,
    recordMap: ExtendedRecordMap,
    mapImageUrl: MapImageUrl,
) {
    const signedSource = getSignedFileUrl(source, block, recordMap.signed_urls) || source
    return mapImageUrl(signedSource, block)
}

export function collectVideoThumbnailUrls(recordMap: ExtendedRecordMap, mapImageUrl: MapImageUrl): string[] {
    const urls = new Set<string>()

    for (const record of Object.values(recordMap.block)) {
        const block = getBlockValue(record)
        if (!block) continue

        const thumbnailSource = getVideoThumbnailSource(block)
        if (!thumbnailSource) continue

        const thumbnailUrl = resolvePreviewImageUrl(thumbnailSource, block, recordMap, mapImageUrl)
        if (thumbnailUrl) urls.add(thumbnailUrl)
    }

    return [...urls]
}

export function collectVideoPreviewDescriptors(
    recordMap: ExtendedRecordMap,
    mapImageUrl: MapImageUrl,
): VideoPreviewDescriptor[] {
    const descriptors: VideoPreviewDescriptor[] = []

    for (const record of Object.values(recordMap.block)) {
        const block = getBlockValue(record)
        if (!block) continue

        const thumbnailSource = getVideoThumbnailSource(block)
        if (!thumbnailSource) continue

        const thumbnailUrl = resolvePreviewImageUrl(thumbnailSource, block, recordMap, mapImageUrl)
        if (!thumbnailUrl) continue

        const preview = recordMap.preview_images?.[thumbnailUrl] || recordMap.preview_images?.[normalizeUrl(thumbnailUrl)]
        if (
            !preview ||
            !Number.isFinite(preview.originalWidth) ||
            !Number.isFinite(preview.originalHeight) ||
            preview.originalWidth <= 0 ||
            preview.originalHeight <= 0
        ) {
            continue
        }

        descriptors.push({
            blockId: uuidToId(block.id),
            width: preview.originalWidth,
            height: preview.originalHeight,
            dataURIBase64: preview.dataURIBase64,
            thumbnailUrl,
        })
    }

    return descriptors
}

export function calculateVideoDisplayHeight(
    containerWidth: number,
    intrinsicWidth: number,
    intrinsicHeight: number,
): number | null {
    if (
        !Number.isFinite(containerWidth) ||
        !Number.isFinite(intrinsicWidth) ||
        !Number.isFinite(intrinsicHeight) ||
        containerWidth <= 0 ||
        intrinsicWidth <= 0 ||
        intrinsicHeight <= 0
    ) {
        return null
    }

    return (containerWidth * intrinsicHeight) / intrinsicWidth
}

export function buildVideoPreviewStyleSheet(descriptors: readonly VideoPreviewDescriptor[]): string {
    return descriptors
        .filter(
            ({ blockId, width, height }) =>
                /^[a-f\d]{32}$/i.test(blockId) && Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0,
        )
        .map(
            ({ blockId, width, height, dataURIBase64 }) => `
.notion-block-${blockId} > div:has(> video) {
    aspect-ratio: ${width} / ${height};
    height: auto !important;
    overflow: hidden;
    background-image: url(${JSON.stringify(dataURIBase64)});
    background-position: center;
    background-size: cover;
}

.notion-block-${blockId} > div > video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    opacity: 0;
}
`,
        )
        .join('\n')
}
