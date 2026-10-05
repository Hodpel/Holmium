import { getStableNotionFileSource, parsePageId } from 'notion-utils'

import { getAccessiblePageRecordMap } from '@/lib/notion/pageAccess'
import { getPageFileBlock } from '@/lib/notion/fileResources'
import { resolveNotionFileUrl } from '@/lib/notion/fileSigning'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ pageId: string; blockId: string }> },
): Promise<Response> {
    const headers = { 'Cache-Control': 'no-store' }
    const { pageId: rawPageId, blockId: rawBlockId } = await params
    const pageId = parsePageId(rawPageId, { uuid: true })
    const blockId = parsePageId(rawBlockId, { uuid: true })
    if (!pageId || !blockId) return new Response(null, { status: 404, headers })

    try {
        // Old ISR pages may still carry a revision query. Resource access is
        // authorized by the current public page and block, not its article revision.
        const parentId = new URL(request.url).searchParams.get('parent')
        const recordMap = await getAccessiblePageRecordMap(pageId, parentId)
        if (!recordMap) {
            return new Response(null, { status: 404, headers })
        }

        const block = getPageFileBlock(recordMap, pageId, blockId)
        const source = block?.properties?.source?.[0]?.[0]
        const fileSource = source && getStableNotionFileSource(source)
        if (!fileSource) return new Response(null, { status: 404, headers })

        const location = await resolveNotionFileUrl(blockId, fileSource)
        return new Response(null, { status: 307, headers: { ...headers, Location: location } })
    } catch {
        // Do not expose signed URLs or upstream credentials in error responses.
        return new Response('资源暂时无法获取，请稍后重试。', { status: 502, headers })
    }
}
