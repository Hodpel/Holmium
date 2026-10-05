import config from '@/blog.config'
import { buildRssFeed } from '@/lib/feed/rss'
import getPostsList from '@/lib/notion/getPostsList'

export const revalidate = 300

export async function GET(): Promise<Response> {
    const posts = await getPostsList({ includePages: false })
    const feed = buildRssFeed({
        title: config.title,
        description: config.description,
        locale: config.locale,
        siteUrl: config.siteUrl,
        entries: posts,
    })

    return new Response(feed, {
        headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'X-Content-Type-Options': 'nosniff',
        },
    })
}
