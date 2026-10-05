import type { BlogEntrySummary } from '@/lib/blog/types'
import { buildSiteUrl } from '@/lib/metadata/site-url'

type BuildRssFeedOptions = {
    title: string
    description: string
    locale: string
    siteUrl: string
    entries: readonly BlogEntrySummary[]
}

const INVALID_XML_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/gu

function escapeXml(value: string): string {
    return value
        .replace(INVALID_XML_CHARACTERS, '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;')
}

function formatRssDate(value: string): string {
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) throw new Error(`Cannot generate RSS with an invalid publication date: ${value}`)
    return date.toUTCString()
}

export function buildRssFeed({ title, description, locale, siteUrl, entries }: BuildRssFeedOptions): string {
    const posts = entries.filter((entry) => entry.kind === 'post')
    const homeUrl = buildSiteUrl(siteUrl)
    const feedUrl = buildSiteUrl(siteUrl, '/feed.xml')
    const publicationTimes = posts.map((post) => {
        const time = Date.parse(post.publishedAt)
        if (!Number.isFinite(time)) throw new Error(`Cannot generate RSS with an invalid publication date: ${post.publishedAt}`)
        return time
    })
    const latestPublishedAt = publicationTimes.length ? new Date(Math.max(...publicationTimes)).toUTCString() : undefined

    const items = posts.map((post) => {
        const postUrl = buildSiteUrl(siteUrl, `/${encodeURIComponent(post.slug)}`)
        const summary = post.summary ? `\n      <description>${escapeXml(post.summary)}</description>` : ''
        const categories = post.tags.map((tag) => `\n      <category>${escapeXml(tag)}</category>`).join('')

        return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="false">urn:holmium:notion:${escapeXml(post.id)}</guid>
      <pubDate>${formatRssDate(post.publishedAt)}</pubDate>${summary}${categories}
    </item>`
    })

    const lastBuildDate = latestPublishedAt ? `\n    <lastBuildDate>${latestPublishedAt}</lastBuildDate>` : ''
    const itemMarkup = items.length ? `\n${items.join('\n')}` : ''

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(homeUrl)}</link>
    <description>${escapeXml(description || title)}</description>
    <language>${escapeXml(locale)}</language>
    <generator>Holmium</generator>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />${lastBuildDate}${itemMarkup}
  </channel>
</rss>
`
}
