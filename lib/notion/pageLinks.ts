import { parsePageId } from 'notion-utils'

import type { BlogIndex } from '@/lib/blog/types'

export type NotionPageHrefMap = Readonly<Record<string, string>>

const NOTION_HOSTS = ['notion.so', 'notion.site', 'notion.com'] as const

function isNotionHost(hostname: string): boolean {
    const normalizedHostname = hostname.toLowerCase()
    return NOTION_HOSTS.some((host) => normalizedHostname === host || normalizedHostname.endsWith(`.${host}`))
}

function normalizeNotionPageId(value: string): string | null {
    return parsePageId(value, { uuid: false }) || null
}

export function buildNotionPageHrefMap(index: BlogIndex, homeHref: string): NotionPageHrefMap {
    const normalizedHomeHref = homeHref === '/' ? '' : homeHref.replace(/\/+$/, '')
    const rootPageId = normalizeNotionPageId(index.rootPageId)
    const entries = index.entries.flatMap((entry) => {
        const pageId = normalizeNotionPageId(entry.id)
        return pageId ? [[pageId, `${normalizedHomeHref}/${encodeURIComponent(entry.slug)}`] as const] : []
    })

    return Object.fromEntries(rootPageId ? [[rootPageId, homeHref], ...entries] : entries)
}

export function resolveNotionPageHref(pageId: string, pageHrefMap: NotionPageHrefMap): string {
    const normalizedPageId = normalizeNotionPageId(pageId)
    if (normalizedPageId && pageHrefMap[normalizedPageId]) return pageHrefMap[normalizedPageId]

    return `https://www.notion.so/${normalizedPageId || pageId.replace(/-/g, '')}`
}

export function resolveKnownNotionUrl(href: string, pageHrefMap: NotionPageHrefMap): string | null {
    try {
        const url = new URL(href)
        if (!isNotionHost(url.hostname)) return null

        const pageId = normalizeNotionPageId(href)
        const mappedHref = pageId ? pageHrefMap[pageId] : undefined
        return mappedHref ? `${mappedHref}${url.hash}` : null
    } catch {
        return null
    }
}

export function resolveSiteHref(href: string, siteUrl: string): string | null {
    try {
        const targetUrl = new URL(href)
        const configuredUrl = new URL(siteUrl)
        const usesHttp = targetUrl.protocol === 'http:' || targetUrl.protocol === 'https:'

        if (!usesHttp || targetUrl.host !== configuredUrl.host) return null

        return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`
    } catch {
        return null
    }
}

export function resolveNotionPageLinkHref(href: string, pageHrefMap: NotionPageHrefMap): string | null {
    if (href.startsWith('/') && !href.startsWith('//')) return href

    try {
        const url = new URL(href)
        if (!isNotionHost(url.hostname)) return href

        return resolveKnownNotionUrl(href, pageHrefMap)
    } catch {
        return href
    }
}
