import type { BlogEntrySummary } from './types'

export function parseTagRouteSegment(value: string): string | null {
    if (!value) return null

    try {
        const decoded = decodeURIComponent(value)
        return decoded || null
    } catch {
        return null
    }
}

export function filterBlogEntriesByTag(entries: readonly BlogEntrySummary[], tag: string): BlogEntrySummary[] {
    return entries.filter((entry) => entry.kind === 'post' && entry.tags.includes(tag))
}

export function buildTagHref(tag: string, page = 1): string {
    const basePath = `/tag/${encodeURIComponent(tag)}`
    return page === 1 ? basePath : `${basePath}/page/${page}`
}
