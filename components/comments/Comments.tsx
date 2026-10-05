import config from '@/blog.config'
import ArtalkComments from '@/components/comments/artalk'
import GiscusComments from '@/components/comments/giscus'
import type { BlogEntrySummary } from '@/lib/blog/types'

interface CommentsProps {
    post: BlogEntrySummary
}

interface ConfiguredGiscusConfig {
    repo: `${string}/${string}`
    repoId: string
    category: string
    categoryId: string
}

function isConfiguredGiscus(value: typeof config.comment.giscusConfig): value is ConfiguredGiscusConfig {
    const [owner, repo, extra] = value.repo.split('/')
    return Boolean(
        owner?.trim() &&
            repo?.trim() &&
            !extra &&
            value.repo === value.repo.trim() &&
            value.repoId.trim() &&
            value.category.trim() &&
            value.categoryId.trim()
    )
}

function isConfiguredArtalk(value: typeof config.comment.artalkConfig): boolean {
    try {
        const server = new URL(value.server)
        return server.protocol === 'https:' && Boolean(value.site.trim())
    } catch {
        return false
    }
}

/**
 * Stable entry point for the configured comment provider.
 * Provider-specific client code stays behind this server-rendered boundary.
 */
export default function Comments({ post }: CommentsProps) {
    if (!config.comment.provider) return null

    if (config.comment.provider === 'giscus') {
        if (!isConfiguredGiscus(config.comment.giscusConfig)) {
            console.warn('[comments] Giscus is enabled but its repository or category configuration is incomplete.')
            return null
        }

        return <GiscusComments pageId={post.id} locale={config.locale} config={config.comment.giscusConfig} />
    }

    if (config.comment.provider === 'artalk') {
        if (!isConfiguredArtalk(config.comment.artalkConfig)) {
            console.warn('[comments] Artalk is enabled but its server or site configuration is invalid.')
            return null
        }

        return (
            <ArtalkComments
                pageKey={post.slug}
                pageTitle={post.title}
                locale={config.locale}
                server={config.comment.artalkConfig.server}
                site={config.comment.artalkConfig.site}
                accentColor={config.themeColor}
                lightBackground={config.lightBackground}
                darkBackground={config.darkBackground}
            />
        )
    }

    return null
}
