import type { BlogEntrySummary } from './types'

export const MAX_SEARCH_QUERY_LENGTH = 100

function normalizeSearchText(value: string, locale: string): string {
    return value.trim().normalize('NFKC').toLocaleLowerCase(locale)
}

export function normalizeSearchQuery(value: string, locale: string): string {
    const normalized = normalizeSearchText(value, locale)
    return Array.from(normalized).slice(0, MAX_SEARCH_QUERY_LENGTH).join('')
}

export function searchBlogEntries(
    entries: readonly BlogEntrySummary[],
    query: string,
    locale: string,
): BlogEntrySummary[] {
    const normalizedQuery = normalizeSearchQuery(query, locale)
    const posts = entries.filter((entry) => entry.kind === 'post')
    if (!normalizedQuery) return posts

    return posts.filter((entry) => {
        const searchableValues = [entry.title, entry.summary ?? '', ...entry.tags]
        return searchableValues.some((value) => normalizeSearchText(value, locale).includes(normalizedQuery))
    })
}

export function buildSearchHref(query: string, page: number): string {
    const searchParams = new URLSearchParams()
    if (query) searchParams.set('q', query)
    if (page > 1) searchParams.set('page', String(page))

    const serialized = searchParams.toString()
    return serialized ? `/search?${serialized}` : '/search'
}
