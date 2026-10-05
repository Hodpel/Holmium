import { getBlockValue, getPageContentBlockIds, getSignedFileUrl, parsePageId } from 'notion-utils'

import { getAccessiblePageRecordMap } from '@/lib/notion/pageAccess'
import { getHtmlArtifactVersion, isHtmlArtifactBlock } from '@/lib/notion/htmlArtifacts'

const MAX_HTML_BYTES = 5 * 1024 * 1024
const NOTION_FILE_HOSTS = new Set(['file.notion.so', 'file.notion.com'])

function notFound(): Response {
    return new Response(null, { status: 404 })
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ pageId: string; blockId: string }> },
): Promise<Response> {
    const { pageId: rawPageId, blockId: rawBlockId } = await params
    const pageId = parsePageId(rawPageId, { uuid: true })
    const blockId = parsePageId(rawBlockId, { uuid: true })
    if (!pageId || !blockId) return notFound()

    const search = new URL(request.url).searchParams
    const parentId = search.get('parent')
    const recordMap = await getAccessiblePageRecordMap(pageId, parentId)
    if (!recordMap) return notFound()
    if (!getPageContentBlockIds(recordMap, pageId).includes(blockId)) return notFound()
    const block = getBlockValue(recordMap.block[blockId])
    if (!isHtmlArtifactBlock(block)) return notFound()

    const attachment = block.properties?.source?.[0]?.[0]
    if (!attachment?.startsWith('attachment:')) return notFound()

    const requestedAsset = search.get('asset')
    if (requestedAsset ? requestedAsset !== getHtmlArtifactVersion(attachment) : !search.has('revision')) return notFound()

    const source = getSignedFileUrl(attachment, block, recordMap.signed_urls)
    if (!source) return notFound()

    const sourceUrl = new URL(source)
    if (!NOTION_FILE_HOSTS.has(sourceUrl.hostname.toLowerCase())) return notFound()

    const upstream = await fetch(source, { cache: 'no-store', redirect: 'follow' })
    if (!upstream.ok) return new Response(null, { status: 502 })

    const contentLength = Number(upstream.headers.get('content-length'))
    if (Number.isFinite(contentLength) && contentLength > MAX_HTML_BYTES) {
        return new Response(null, { status: 413 })
    }

    const html = await upstream.arrayBuffer()
    if (html.byteLength > MAX_HTML_BYTES) return new Response(null, { status: 413 })

    return new Response(html, {
        headers: {
            // Legacy article-version URLs can serve the current asset, but must
            // not store changed HTML permanently under an old revision key.
            'Cache-Control': requestedAsset && parentId === null ? 'public, max-age=300, s-maxage=31536000, immutable' : 'no-store',
            ...(parentId !== null ? { 'X-Robots-Tag': 'noindex' } : {}),
            'Content-Disposition': 'inline',
            'Content-Security-Policy': [
                'sandbox allow-scripts',
                "default-src 'none'",
                "script-src 'unsafe-inline' https:",
                "style-src 'unsafe-inline' https:",
                'img-src data: blob: https:',
                'font-src data: https:',
                'media-src data: blob: https:',
                'connect-src https:',
                'frame-src https:',
                "object-src 'none'",
                "base-uri 'none'",
                "form-action 'none'",
            ].join('; '),
            'Content-Type': 'text/html; charset=utf-8',
            'Cross-Origin-Resource-Policy': 'same-origin',
            'Referrer-Policy': 'no-referrer',
            'X-Content-Type-Options': 'nosniff',
        },
    })
}
