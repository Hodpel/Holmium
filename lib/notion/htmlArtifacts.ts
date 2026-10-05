import { createHash } from 'node:crypto'

import { getBlockValue } from 'notion-utils'
import type { Block, EmbedBlock, ExtendedRecordMap } from 'notion-types'

const HTML_ARTIFACT_ROUTE = '/-/notion-html'

export function getHtmlArtifactVersion(attachment: string): string {
    return createHash('sha256').update(attachment).digest('hex').slice(0, 20)
}

export function isHtmlArtifactBlock(block: Block | undefined): block is EmbedBlock {
    if (block?.type !== 'embed') return false

    return Reflect.get(block.format || {}, 'embed_variant') === 'html_artifact'
}

export function projectHtmlArtifactUrls(
    recordMap: ExtendedRecordMap,
    pageId: string,
    parentPageId?: string,
): ExtendedRecordMap {
    let signedUrls: Record<string, string> | undefined

    for (const entry of Object.values(recordMap.block)) {
        const block = getBlockValue(entry)
        if (!isHtmlArtifactBlock(block)) continue

        const attachment = block?.properties?.source?.[0]?.[0]
        if (!attachment?.startsWith('attachment:')) continue

        signedUrls ||= { ...recordMap.signed_urls }
        const route = `${HTML_ARTIFACT_ROUTE}/${pageId}/${block.id}?asset=${getHtmlArtifactVersion(attachment)}${parentPageId ? `&parent=${encodeURIComponent(parentPageId)}` : ''}`
        signedUrls[attachment] = route
        signedUrls[block.id] = route
    }

    return signedUrls ? { ...recordMap, signed_urls: signedUrls } : recordMap
}
