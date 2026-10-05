// 外部依赖
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createHash } from 'crypto'
import { Suspense } from 'react'

// 配置文件
import config from '@/blog.config'
import advancedConfig from '@/config/blog.advanced'

// 工具函数
import getPostsList, { getPostSnapshot } from '@/lib/notion/getPostsList'
import { decodeRouteSlug } from '@/lib/navigation/route-slug'
import { buildSiteUrl } from '@/lib/metadata/site-url'
import { getArticleCover } from '@/lib/notion/articleCover'
import { buildSpecialPageRegistry } from '@/lib/special-pages/registry'

// 通用组件
import Container from '@/components/Container'

// 页面组件
import EntryContent, { EntryBody } from '@/components/entry/EntryContent'
import { PostNav } from '@/components/entry/EntryNavigation'
import Comments from '@/components/comments/Comments'
import ArchivePage from '@/components/special-pages/ArchivePage'
import MomentsPage from '@/components/special-pages/MomentsPage'

export async function generateStaticParams(): Promise<{ slug: string }[]> {
    const posts = await getPostsList({ includePages: true })
    return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug: rawSlug } = await params
    const slug = decodeRouteSlug(rawSlug)

    const snapshot = await getPostSnapshot(slug)
    if (!snapshot) return {}
    const { post } = snapshot
    const entries = advancedConfig.specialPages.length > 0 ? await getPostsList({ includePages: true }) : []
    const specialPage = buildSpecialPageRegistry(advancedConfig.specialPages, entries).get(post.id)
    const isArticle = post.kind === 'post' && !specialPage

    const description = post.summary || undefined

    return {
        title: post.title,
        ...(description ? { description } : {}),
        alternates: {
            canonical: buildSiteUrl(config.siteUrl, `/${encodeURIComponent(post.slug)}`),
        },
        openGraph: {
            title: post.title,
            ...(description ? { description } : {}),
            type: isArticle ? 'article' : 'website',
            ...(isArticle ? { publishedTime: post.publishedAt } : {}),
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            ...(description ? { description } : {}),
        },
    }
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
    const { slug: rawSlug } = await params
    const slug = decodeRouteSlug(rawSlug)
    const data = await getPostSnapshot(slug)

    if (!data) notFound()
    const emailHash = createHash('md5').update(config.author.email).digest('hex').trim().toLowerCase()
    const entries = advancedConfig.specialPages.length > 0 ? await getPostsList({ includePages: true }) : []
    const specialPages = buildSpecialPageRegistry(advancedConfig.specialPages, entries)
    const specialPage = specialPages.get(data.post.id)

    if (specialPage?.type === 'archive') {
        return (
            <ArchivePage
                post={data.post}
                recordMap={data.recordMap}
                pageHrefMap={data.pageHrefMap}
                posts={entries.filter((entry) => !specialPages.has(entry.id))}
                emailHash={emailHash}
                cover={getArticleCover(data.recordMap, data.post.id)}
            />
        )
    }

    if (specialPage?.type === 'moments') {
        return (
            <MomentsPage
                post={data.post}
                recordMap={data.recordMap}
                pageHrefMap={data.pageHrefMap}
                emailHash={emailHash}
                cover={getArticleCover(data.recordMap, data.post.id)}
            />
        )
    }

    return (
        <Container fullWidth={data.post.fullWidth} postTitle={data.post.title} cover={getArticleCover(data.recordMap, data.post.id)}>
            <EntryContent post={data.post} emailHash={emailHash}>
                <Suspense fallback={null}>
                    <EntryBody post={data.post} recordMap={data.recordMap} pageHrefMap={data.pageHrefMap}>
                        <PostNav kind={data.post.kind} homeHref={config.path || '/'} />
                    </EntryBody>
                </Suspense>
            </EntryContent>
            <Comments post={data.post} />
        </Container>
    )
}
