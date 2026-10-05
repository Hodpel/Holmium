import type { ExtendedRecordMap } from 'notion-types'
import { getBlockValue } from 'notion-utils'

// A work estimate, not a time budget: large atomic subtrees can still be expensive.
const BATCH_WORK = 32
const INITIAL_BATCH_WORK = 48
const SHORT_PAGE_WORK = 64
const normalizeId = (id: string) => id.replaceAll('-', '')

export function planRenderBatches(recordMap: ExtendedRecordMap) {
    const rootId = Object.keys(recordMap.block)[0]
    const content = getBlockValue(recordMap.block[rootId])?.content ?? []
    const targetIndices = new Map<string, number>()
    const costs = content.map((id, index) => {
        const seen = new Set<string>()
        const visit = (blockId: string): number => {
            if (seen.has(blockId)) return 0
            seen.add(blockId)
            targetIndices.set(normalizeId(blockId), index + 1)
            const block = getBlockValue(recordMap.block[blockId])
            const weight = block?.type === 'collection_view' ? 24 : block?.type === 'code' ? 8 : 1
            return weight + (block?.content ?? []).reduce((sum, child) => sum + visit(child), 0)
        }
        return visit(id)
    })
    const ends: number[] = []
    if (costs.reduce((sum, cost) => sum + cost, 0) <= SHORT_PAGE_WORK) {
        ends.push(content.length)
    } else {
        let work = 0
        content.forEach((id, index) => {
            work += costs[index]
            const type = getBlockValue(recordMap.block[id])?.type
            const nextType = getBlockValue(recordMap.block[content[index + 1]])?.type
            const continuesList = (type === 'numbered_list' || type === 'bulleted_list') && type === nextType
            const budget = ends.length === 0 ? INITIAL_BATCH_WORK : BATCH_WORK
            if (index === content.length - 1 || (work >= budget && !continuesList)) {
                ends.push(index + 1)
                work = 0
            }
        })
    }
    const targetEnds = new Map([...targetIndices].map(([id, index]) => [id, ends.find(end => end >= index)!]))
    return { rootId, content, ends, targetEnds }
}

export type RenderBatchPlan = ReturnType<typeof planRenderBatches>

export function projectRenderBatch(recordMap: ExtendedRecordMap, plan: RenderBatchPlan, end: number) {
    // Render through an alias, leaving the real page's content intact for parent
    // lookups (embedded TOC, list numbering, etc.). Keep this key at completion too
    // so react-notion-x does not remount the tree and reset interactive blocks.
    const blockId = `holmium-render:${plan.rootId}`
    const root = getBlockValue(recordMap.block[plan.rootId])!
    return {
        blockId,
        recordMap: {
            ...recordMap,
            block: {
                ...recordMap.block,
                [blockId]: { role: 'reader', value: { ...root, content: plan.content.slice(0, end) } },
            },
        } as ExtendedRecordMap,
    }
}
