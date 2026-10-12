import { getBlockValue, getSignedFileUrl, normalizeUrl } from 'notion-utils'
import type { Block, Decoration, ExtendedRecordMap } from 'notion-types'
import { mapNotionImageUrl } from './imageUrl.ts'
import { getVideoThumbnailSource, resolvePreviewImageUrl } from './videoPreview.ts'

export type FileMediaDescriptor = {
    blockId: string; kind: 'video' | 'audio'; src: string; poster?: string; preview?: string
    reservedRatio: readonly [number, number]; intrinsicRatioKnown: boolean; caption?: Decoration[]
}
type FileFormat = NonNullable<Block['format']> & { holmium_file_media?: FileMediaDescriptor }

function httpUrl(source: string): URL | null {
    try {
        const url = new URL(source, 'https://holmium.invalid')
        return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url : null
    } catch { return null }
}

export function projectFileMediaBlocks(recordMap: ExtendedRecordMap): { recordMap: ExtendedRecordMap; media: ReadonlyMap<string, FileMediaDescriptor> } {
    const media = new Map<string, FileMediaDescriptor>()
    let blocks: ExtendedRecordMap['block'] | undefined
    for (const [id, entry] of Object.entries(recordMap.block)) {
        const block = getBlockValue(entry)
        if (!block) continue
        const format = block.format as FileFormat | undefined
        if (format?.holmium_file_media) { media.set(id, format.holmium_file_media); continue }
        if (block.type !== 'video' && block.type !== 'audio') continue
        const raw = block.properties?.source?.[0]?.[0]
        if (!raw) continue
        const host = httpUrl(format?.display_source || raw)?.hostname || ''
        if (block.type === 'video' && ['youtube.com', 'youtube-nocookie.com', 'youtu.be', 'vimeo.com', 'wistia.com', 'wistia.net', 'loom.com', 'videoask.com', 'getcloudapp.com', 'tella.tv', 'bilibili.com'].some(domain => host === domain || host.endsWith(`.${domain}`))) continue
        const src = getSignedFileUrl(raw, block, recordMap.signed_urls) || raw
        if (!httpUrl(src)) continue
        const thumbnail = getVideoThumbnailSource(block)
        const poster = thumbnail ? resolvePreviewImageUrl(thumbnail, block, recordMap, mapNotionImageUrl) : undefined
        const preview = poster ? recordMap.preview_images?.[poster] || recordMap.preview_images?.[normalizeUrl(poster)] : undefined
        const intrinsic = !!(preview && Number.isFinite(preview.originalWidth) && Number.isFinite(preview.originalHeight) && preview.originalWidth > 0 && preview.originalHeight > 0)
        const width = intrinsic ? preview!.originalWidth : format?.block_width
        const height = intrinsic ? preview!.originalHeight : format?.block_height
        const ratioKnown = typeof width === 'number' && typeof height === 'number' && Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
        const descriptor: FileMediaDescriptor = {
            blockId: id, kind: block.type, src, poster, preview: preview?.dataURIBase64,
            reservedRatio: ratioKnown ? [width, height] : [16, 9], intrinsicRatioKnown: intrinsic, caption: block.properties?.caption,
        }
        media.set(id, descriptor)
        const projected = { ...block, type: 'embed', format: { ...format, holmium_file_media: descriptor } } as Block
        blocks ??= { ...recordMap.block }
        const original = entry.value
        blocks[id] = original && 'value' in original
            ? { ...entry, value: { ...original, value: projected } } as typeof entry
            : { ...entry, value: projected }
    }
    return { recordMap: blocks ? { ...recordMap, block: blocks } : recordMap, media }
}
