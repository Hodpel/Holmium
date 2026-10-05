import type { BlogEntrySummary, BlogIcon } from '../blog/types'

export interface ArchivePost {
    id: string
    slug: string
    title: string
    day: string
    dateTime: string
    icon: BlogIcon
}

export interface ArchiveMonth {
    key: string
    label: string
    posts: ArchivePost[]
}

export interface ArchiveYear {
    id: string
    months: ArchiveMonth[]
}

function dateParts(timestamp: number, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
    }).formatToParts(timestamp)
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
    return { year: value('year'), month: value('month') }
}

export function buildArchiveYears(
    entries: readonly BlogEntrySummary[],
    locale: string,
    timeZone: string,
): ArchiveYear[] {
    const datedPosts = entries
        .map((entry, sourceIndex) => ({ entry, sourceIndex, timestamp: Date.parse(entry.publishedAt) }))
        .filter(({ entry, timestamp }) => entry.kind === 'post' && Number.isFinite(timestamp))
        .sort((a, b) => b.timestamp - a.timestamp || a.sourceIndex - b.sourceIndex)

    const years: ArchiveYear[] = []
    const monthFormatter = new Intl.DateTimeFormat(locale, { timeZone, month: 'long' })
    const dayFormatter = new Intl.DateTimeFormat(locale, { timeZone, day: 'numeric' })

    for (const { entry, timestamp } of datedPosts) {
        const { year, month } = dateParts(timestamp, timeZone)
        let yearGroup = years.at(-1)
        if (yearGroup?.id !== year) {
            yearGroup = { id: year, months: [] }
            years.push(yearGroup)
        }

        let monthGroup = yearGroup.months.at(-1)
        if (monthGroup?.key !== month) {
            monthGroup = { key: month, label: monthFormatter.format(timestamp), posts: [] }
            yearGroup.months.push(monthGroup)
        }

        monthGroup.posts.push({
            id: entry.id,
            slug: entry.slug,
            title: entry.title,
            day: dayFormatter.format(timestamp),
            dateTime: entry.publishedAt,
            icon: entry.icon,
        })
    }

    return years
}

export function archiveTableOfContents(years: readonly ArchiveYear[]) {
    return years.length >= 3
        ? years.map((year) => ({ id: year.id, indentLevel: 0, text: year.id }))
        : []
}
