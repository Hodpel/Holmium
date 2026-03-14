import { idToUuid } from 'notion-utils'
import { type ExtendedRecordMap } from 'notion-types'

export default function getPostIds(recordMap: ExtendedRecordMap, viewId?: string) {
    const collectionQuery = recordMap.collection_query
    let pageIds: string[] = []
    if (viewId) {
        // 如果指定了 viewId，只获取该视图的页面ID
        const vId = idToUuid(viewId)
        // 遍历所有块，查找匹配的视图
        Object.values(collectionQuery).forEach((blockData) => {
            if (blockData[vId]?.collection_group_results?.blockIds) {
                pageIds = blockData[vId].collection_group_results.blockIds
            }
        })
    } else {
        // 如果没有指定 viewId，获取所有视图的去重页面ID
        const pageSet = new Set<string>()
        // 遍历所有块
        Object.values(collectionQuery).forEach((blockData) => {
            // 遍历每个块下的所有视图
            Object.values(blockData).forEach((view) => {
                // 添加该视图的所有页面ID到Set中（自动去重）
                view?.collection_group_results?.blockIds?.forEach((id) => pageSet.add(id))
            })
        })
        pageIds = [...pageSet]
    }
    return pageIds
}
