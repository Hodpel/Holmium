import { getBlockValue, getSignedFileUrl } from 'notion-utils'
import type { Block, ExtendedRecordMap } from 'notion-types'

export type MapImageUrl = (url: string | undefined, block: Block) => string | undefined
export const VIDEO_PREVIEW_MAX_DIMENSION = 32

type VideoBlockFormat = NonNullable<Block['format']> & {
    video_thumbnail?: string
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
