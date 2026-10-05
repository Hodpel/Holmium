import type { Block, ExtendedRecordMap } from 'notion-types'
import { getBlockValue, getTextContent, parsePageId } from 'notion-utils'

export interface MomentItem {
    id: string
    publishedAt: number
    blockIds: string[]
    sourceIndex: number
}

export interface MomentMonth {
    key: string
    label: string
    moments: MomentItem[]
}

export interface MomentYear {
    id: string
    months: MomentMonth[]
    momentCount: number
}

export interface MomentsDocument {
    introBlockIds: string[]
    years: MomentYear[]
}

type DateDecoration = { start_date?: unknown }

function dateParts(timestamp: number, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(timestamp)
    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value)
    const hour = value('hour')
    return { year: value('year'), month: value('month'), day: value('day'), hour: hour === 24 ? 0 : hour, minute: value('minute'), second: value('second') }
}

function localDateTimestamp(value: string, timeZone: string): number | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (!match) return null
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const calendarCheck = new Date(Date.UTC(year, month - 1, day))
    if (calendarCheck.getUTCFullYear() !== year || calendarCheck.getUTCMonth() !== month - 1 || calendarCheck.getUTCDate() !== day) return null

    let timestamp = Date.UTC(year, month - 1, day)
    for (let pass = 0; pass < 2; pass++) {
        const actual = dateParts(timestamp, timeZone)
        const represented = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second)
        timestamp += Date.UTC(year, month - 1, day) - represented
    }
    const resolved = dateParts(timestamp, timeZone)
    return resolved.year === year && resolved.month === month && resolved.day === day ? timestamp : null
}

function pureDateDecoration(block: Block | undefined): DateDecoration | null | undefined {
    if (block?.type !== 'text') return undefined
    const title = block.properties?.title
    if (!Array.isArray(title)) return undefined
    const meaningful = title.filter((segment) => Array.isArray(segment) && String(segment[0] ?? '').trim())
    if (meaningful.length !== 1) return undefined
    const segment = meaningful[0]
    const decorations = Array.isArray(segment?.[1]) ? segment[1] : []
    if (decorations.length !== 1 || !Array.isArray(decorations[0]) || decorations[0][0] !== 'd') return undefined
    const value = decorations[0][1]
    return value && typeof value === 'object' ? value as DateDecoration : null
}

function isBlank(block: Block | undefined): boolean {
    return block?.type === 'text' && !getTextContent(block.properties?.title).trim()
}

function groupMoments(moments: readonly MomentItem[], locale: string, timeZone: string): MomentYear[] {
    const sorted = [...moments].sort((a, b) => b.publishedAt - a.publishedAt || a.sourceIndex - b.sourceIndex)
    const years: MomentYear[] = []
    const monthFormatter = new Intl.DateTimeFormat(locale, { timeZone, month: 'long' })

    for (const moment of sorted) {
        const parts = dateParts(moment.publishedAt, timeZone)
        const yearId = String(parts.year)
        const monthKey = String(parts.month).padStart(2, '0')
        let year = years.at(-1)
        if (year?.id !== yearId) {
            year = { id: yearId, months: [], momentCount: 0 }
            years.push(year)
        }
        let month = year.months.at(-1)
        if (month?.key !== monthKey) {
            month = { key: monthKey, label: monthFormatter.format(moment.publishedAt), moments: [] }
            year.months.push(month)
        }
        month.moments.push(moment)
        year.momentCount += 1
    }
    return years
}

export function parseMomentsDocument(
    recordMap: ExtendedRecordMap,
    pageId: string,
    locale: string,
    timeZone: string,
): MomentsDocument {
    const rootId = parsePageId(pageId, { uuid: true }) || pageId
    const content = getBlockValue(recordMap.block[rootId])?.content ?? []
    const introBlockIds: string[] = []
    const sections: { divider: Block; body: string[]; sourceIndex: number }[] = []

    for (const blockId of content) {
        const block = getBlockValue(recordMap.block[blockId])
        if (block?.type === 'divider') {
            sections.push({ divider: block, body: [], sourceIndex: sections.length })
        } else if (sections.length === 0) {
            introBlockIds.push(blockId)
        } else {
            sections.at(-1)!.body.push(blockId)
        }
    }

    const moments: MomentItem[] = []
    for (const section of sections) {
        let metadataIndex = 0
        while (metadataIndex < section.body.length) {
            const candidate = getBlockValue(recordMap.block[section.body[metadataIndex]])
            if (!isBlank(candidate) || pureDateDecoration(candidate) !== undefined) break
            metadataIndex++
        }
        const metadataBlock = getBlockValue(recordMap.block[section.body[metadataIndex]])
        const decoration = pureDateDecoration(metadataBlock)
        const hasMetadata = decoration !== undefined
        const blockIds = hasMetadata ? section.body.slice(metadataIndex + 1) : section.body
        if (!blockIds.some((id) => !isBlank(getBlockValue(recordMap.block[id])))) continue

        const explicitTimestamp = typeof decoration?.start_date === 'string'
            ? localDateTimestamp(decoration.start_date, timeZone)
            : null
        const fallbackTimestamp = typeof section.divider.created_time === 'number' ? section.divider.created_time : Number.NaN
        const publishedAt = explicitTimestamp ?? fallbackTimestamp
        if (!Number.isFinite(publishedAt)) continue
        moments.push({
            id: section.divider.id,
            publishedAt,
            blockIds,
            sourceIndex: section.sourceIndex,
        })
    }

    return { introBlockIds, years: groupMoments(moments, locale, timeZone) }
}
