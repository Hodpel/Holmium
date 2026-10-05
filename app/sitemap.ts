import type { MetadataRoute } from 'next'

import config from '@/blog.config'
import { buildSitemapRoute } from '@/lib/metadata/routes'
import getPostsList from '@/lib/notion/getPostsList'

export const revalidate = 300

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    if (!config.seo.indexing) return []

    const entries = await getPostsList({ includePages: true })
    return buildSitemapRoute(entries, {
        indexing: config.seo.indexing,
        siteUrl: config.siteUrl,
    })
}
