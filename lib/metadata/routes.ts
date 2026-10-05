import type { MetadataRoute } from 'next'

import type { BlogEntrySummary } from '@/lib/blog/types'
import { buildSiteUrl } from './site-url'

type MetadataRouteOptions = {
    indexing: boolean
    siteUrl: string
}

export function buildRobotsRoute({ indexing, siteUrl }: MetadataRouteOptions): MetadataRoute.Robots {
    return {
        rules: indexing
            ? {
                  userAgent: '*',
                  allow: '/',
              }
            : {
                  userAgent: '*',
                  disallow: '/',
              },
        ...(indexing ? { sitemap: buildSiteUrl(siteUrl, '/sitemap.xml') } : {}),
    }
}

export function buildSitemapRoute(
    entries: readonly BlogEntrySummary[],
    { indexing, siteUrl }: MetadataRouteOptions,
): MetadataRoute.Sitemap {
    if (!indexing) return []

    const publishedTimes = entries.map((entry) => Date.parse(entry.publishedAt)).filter(Number.isFinite)
    const latestPublishedTime = publishedTimes.length ? new Date(Math.max(...publishedTimes)) : undefined

    return [
        {
            url: buildSiteUrl(siteUrl),
            ...(latestPublishedTime ? { lastModified: latestPublishedTime } : {}),
        },
        ...entries.map((entry) => ({
            url: buildSiteUrl(siteUrl, `/${encodeURIComponent(entry.slug)}`),
            lastModified: new Date(entry.publishedAt),
        })),
    ]
}
