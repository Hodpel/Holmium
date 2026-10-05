import {
    getBlockValue,
    getPageContentBlockIds,
    getStableNotionFileSource,
    isNotionFileUrlExpired,
    isNotionSignedFileUrl,
} from 'notion-utils'
import type { Block, ExtendedRecordMap } from 'notion-types'

const FILE_TYPES = new Set(['video', 'audio', 'pdf', 'file'])
const SIGNATURE_MARGIN_MS = 60_000
const MAX_CACHED_SIGNATURES = 128

function getFileSource(block: Block | undefined): string | undefined {
    if (!block || !FILE_TYPES.has(block.type)) return undefined
    const source = block.properties?.source?.[0]?.[0]
    return source ? getStableNotionFileSource(source) : undefined
}

export function getPageFileBlock(recordMap: ExtendedRecordMap, pageId: string, blockId: string): Block | undefined {
    if (!getPageContentBlockIds(recordMap, pageId).includes(blockId)) return undefined
    const block = getBlockValue(recordMap.block[blockId])
    return getFileSource(block) ? block : undefined
}

/** Keep temporary media signatures out of the rendered page's resource links. */
export function projectFileUrls(recordMap: ExtendedRecordMap, pageId: string, parentPageId?: string): ExtendedRecordMap {
    const signedUrls = { ...recordMap.signed_urls }
    for (const blockId of getPageContentBlockIds(recordMap, pageId)) {
        const block = getBlockValue(recordMap.block[blockId])
        if (!block || !getFileSource(block)) continue
        const source = block.properties!.source![0][0]
        const route = `/-/notion-file/${pageId}/${blockId}${parentPageId ? `?parent=${encodeURIComponent(parentPageId)}` : ''}`
        signedUrls[source] = route
        signedUrls[blockId] = route
    }
    return { ...recordMap, signed_urls: signedUrls }
}

/** Sign thumbnails/other assets as before; media payloads are signed only on access. */
export function prepareFileSigning(recordMap: ExtendedRecordMap): ExtendedRecordMap {
    const blocks = { ...recordMap.block }
    for (const [id, entry] of Object.entries(blocks)) {
        const block = getBlockValue(entry)
        if (!block || !getFileSource(block)) continue
        blocks[id] = { ...entry, value: { ...block, properties: { ...block.properties, source: [] } } }
    }
    return { ...recordMap, block: blocks }
}

function isUsableSignature(url: string | undefined, source: string): url is string {
    if (!url) return false
    try {
        const parsed = new URL(url)
        const host = parsed.hostname.toLowerCase()
        const notionHost =
            host === 'file.notion.so' || host === 'file.notion.com' || host === 'secure.notion-static.com' ||
            (host.endsWith('.amazonaws.com') &&
                (host.startsWith('prod-files-secure.') || parsed.pathname.startsWith('/secure.notion-static.com/')))
        return (
            parsed.protocol === 'https:' && !parsed.username && !parsed.password && notionHost &&
            getStableNotionFileSource(url) === source &&
            isNotionSignedFileUrl(url) &&
            isNotionFileUrlExpired(url, Infinity) && // Unknown expiration is not safe to cache.
            !isNotionFileUrlExpired(url, Date.now() + SIGNATURE_MARGIN_MS)
        )
    } catch {
        return false
    }
}

/** A bounded, on-demand cache; concurrent requests for the same file share signing. */
export function createFileUrlResolver(sign: (blockId: string, source: string) => Promise<string | undefined>) {
    const cache = new Map<string, Promise<string>>()

    return async function resolve(blockId: string, source: string): Promise<string> {
        const key = JSON.stringify([blockId, source])
        const existing = cache.get(key)
        if (existing) {
            const url = await existing
            if (isUsableSignature(url, source)) return url
            if (cache.get(key) === existing) cache.delete(key)
            return resolve(blockId, source)
        }

        const pending = sign(blockId, source).then(url => {
            if (!isUsableSignature(url, source)) throw new Error('Notion returned an unusable file signature')
            return new URL(url).href
        })
        if (cache.size >= MAX_CACHED_SIGNATURES) cache.delete(cache.keys().next().value!)
        cache.set(key, pending)
        try {
            return await pending
        } catch (error) {
            if (cache.get(key) === pending) cache.delete(key)
            throw error
        }
    }
}
