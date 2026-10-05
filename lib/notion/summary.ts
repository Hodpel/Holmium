import type { Block, ExtendedRecordMap } from 'notion-types'
import { getBlockIcon, getBlockTitle, getBlockValue } from 'notion-utils'
import type { BlogEntrySummary, SummaryMentionIcon, SummaryPart, SummaryTextMark } from '../blog/types.ts'
import { userDisplayName, userId } from './userMentions.ts'
import { formatNotionDate, type NotionDate } from './dateFormat.ts'

export function getSummaryValue(block: Block, recordMap: ExtendedRecordMap) {
    const collection = getBlockValue(recordMap.collection[block.parent_id])
    const id = Object.keys(collection?.schema ?? {}).find(key => collection?.schema[key].name.toLowerCase() === 'summary')
    return id ? block.properties?.[id] : undefined
}

function object(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : ''
}

function webUrl(value: unknown): string {
    const source = text(value)
    try {
        const url = new URL(source)
        return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? source : ''
    } catch { return '' }
}

/** Project summary rich text without fetching, source mutations, or renderer dependencies. */
export function extractSummary(value: unknown, recordMap: ExtendedRecordMap): Pick<BlogEntrySummary, 'summary' | 'summaryParts'> {
    const parts: SummaryPart[] = []
    let hasMentions = false
    if (!Array.isArray(value)) return { summary: null }
    for (const segment of value) {
        if (!Array.isArray(segment) || typeof segment[0] !== 'string') continue
        const decorations: unknown[] = Array.isArray(segment[1]) ? segment[1] : []
        const dateDecoration = decorations.find(d => Array.isArray(d) && d[0] === 'd') as unknown[] | undefined
        if (dateDecoration) {
            const date = object(dateDecoration[1]) as unknown as NotionDate
            const label = typeof date.start_date === 'string' ? formatNotionDate(date, 'zh-CN') : null
            if (label) {
                hasMentions = true
                parts.push({ type: 'date', text: label, value: date })
                continue
            }
        }
        const person = decorations.map(userId).find(Boolean)
        if (person) {
            const user = getBlockValue(recordMap.notion_user?.[person])
            hasMentions = true
            parts.push({ type: 'person', text: userDisplayName(user, 'zh'), avatar: webUrl(user?.profile_photo) || undefined })
            continue
        }
        const mention = decorations.find(d => Array.isArray(d) && (d[0] === 'eoi' || d[0] === 'lm' || d[0] === 'p')) as unknown[] | undefined
        if (mention) {
            hasMentions = true
            if (mention[0] === 'p') {
                const block = typeof mention[1] === 'string' ? getBlockValue(recordMap.block[mention[1]]) : undefined
                const label = block ? text(getBlockTitle(block, recordMap)) || '未命名' : '页面'
                const rawIcon = block ? text(getBlockIcon(block, recordMap)) : ''
                const src = webUrl(rawIcon) || (rawIcon.startsWith('/icons/') ? webUrl(`https://www.notion.so${rawIcon}`) : '')
                const icon: SummaryMentionIcon = src ? { type: 'image', src, fallback: 'page' }
                    : /\p{Extended_Pictographic}/u.test(rawIcon) && !/[:/]/.test(rawIcon)
                        ? { type: 'emoji', text: rawIcon } : { type: 'page' }
                parts.push({ type: 'mention', text: label, icon })
                continue
            }
            let metadata = object(mention[1])
            let title = text(metadata.title)
            let url = webUrl(metadata.href)
            if (mention[0] === 'eoi') {
                const block = typeof mention[1] === 'string' ? getBlockValue(recordMap.block[mention[1]]) : undefined
                metadata = object(block?.format)
                const attributes = Array.isArray(metadata.attributes) ? metadata.attributes : []
                const values = object(attributes.find(a => object(a).id === 'title')).values
                title = Array.isArray(values) ? text(values[0]) : ''
                url = webUrl(metadata.original_url) || webUrl(metadata.uri)
            }
            const label = title || (segment[0] !== '‣' && segment[0] !== '⁍' ? text(segment[0]) : '') || url || '链接'
            const src = webUrl(metadata.icon_url)
            const icon: SummaryMentionIcon = url && new URL(url).hostname === 'github.com'
                ? { type: 'github' } : src ? { type: 'image', src } : { type: 'link' }
            parts.push({ type: 'mention', text: label, icon })
        } else {
            const equation = decorations.find(d => Array.isArray(d) && d[0] === 'e' && typeof d[1] === 'string') as [string, string] | undefined
            const content = equation ? equation[1] : segment[0] !== '‣' && segment[0] !== '⁍' ? segment[0] : ''
            if (!content) continue
            const marks = (['b', 'i', '_', 's', 'c'] as SummaryTextMark[]).filter(mark => decorations.some(d => Array.isArray(d) && d[0] === mark))
            if (marks.length) hasMentions = true
            const last = parts.at(-1)
            if (last?.type === 'text' && (last.marks ?? []).join('') === marks.join('')) last.text += content
            else parts.push({ type: 'text', text: content, ...(marks.length ? { marks } : {}) })
        }
    }
    const summary = parts.map(part => part.text).join('')
    return { summary: summary.trim() ? summary : null, ...(hasMentions ? { summaryParts: parts } : {}) }
}
