import type { ExtendedRecordMap } from 'notion-types'
import { getBlockValue, parsePageId } from 'notion-utils'

export function projectPageContent(
    recordMap: ExtendedRecordMap,
    pageId: string,
    content: readonly string[],
    projectionId: string,
): { blockId: string; recordMap: ExtendedRecordMap } {
    const rootId = parsePageId(pageId, { uuid: true }) || pageId
    const root = getBlockValue(recordMap.block[rootId])
    if (!root) throw new Error(`Cannot project Notion page ${pageId}: root block was not found`)

    const blockId = `holmium-fragment:${projectionId}`
    return {
        blockId,
        recordMap: {
            ...recordMap,
            block: {
                ...recordMap.block,
                [blockId]: { role: 'reader', value: { ...root, id: blockId, content: [...content] } },
            },
        },
    }
}
