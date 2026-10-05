import type { ExtendedRecordMap } from 'notion-types'
import { getBlockValue, normalizeUrl, parsePageId } from 'notion-utils'
import { mapNotionImageUrl } from './imageUrl.ts'
import { resolvePreviewImageUrl } from './videoPreview.ts'

export type ArticleCover = { src: string; position: number; preview?: string }

export function getArticleCover(recordMap: ExtendedRecordMap, pageId: string): ArticleCover | null {
    const page = getBlockValue(recordMap.block[parsePageId(pageId, { uuid: true }) || pageId])
    if (page?.type !== 'page') return null
    const source = page.format?.page_cover
    if (!source || !/^(https?:\/\/|attachment:|\/images\/|\/image\/)/.test(source)) return null
    const src = mapNotionImageUrl(source, page)
    if (!src) return null
    const position = page.format?.page_cover_position
    const previewUrl = resolvePreviewImageUrl(source, page, recordMap, mapNotionImageUrl) || src
    const preview = recordMap.preview_images?.[previewUrl] || recordMap.preview_images?.[normalizeUrl(previewUrl)]
    return {
        src,
        position: (1 - (typeof position === 'number' && Number.isFinite(position) ? Math.min(1, Math.max(0, position)) : 0.5)) * 100,
        preview: preview?.dataURIBase64,
    }
}
