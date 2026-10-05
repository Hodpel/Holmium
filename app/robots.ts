import type { MetadataRoute } from 'next'

import config from '@/blog.config'
import { buildRobotsRoute } from '@/lib/metadata/routes'

export default function robots(): MetadataRoute.Robots {
    return buildRobotsRoute({
        indexing: config.seo.indexing,
        siteUrl: config.siteUrl,
    })
}
