import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { Suspense } from 'react'
import Container from '@/components/Container'
import EntryContent, { EntryBody } from '@/components/entry/EntryContent'
import { PostNav } from '@/components/entry/EntryNavigation'
import { getSubpageBySlug } from '@/lib/notion/getPostsList'
import { getArticleCover } from '@/lib/notion/articleCover'
import { buildSiteUrl } from '@/lib/metadata/site-url'
import config from '@/blog.config'
import { decodeRouteSlug } from '@/lib/navigation/route-slug'

type Props = { params: Promise<{ slug: string; subpage: string }> }
export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug, subpage } = await params
    const data = await getSubpageBySlug(decodeRouteSlug(slug), decodeRouteSlug(subpage))
    return {
        title: data?.post.title,
        robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
        ...(data ? { alternates: { canonical: buildSiteUrl(config.siteUrl, `/${data.post.slug}`) } } : {}),
    }
}

export default async function Subpage({ params }: Props) {
    const { slug, subpage } = await params
    const data = await getSubpageBySlug(decodeRouteSlug(slug), decodeRouteSlug(subpage))
    if (!data) notFound()
    if (`/${encodeURIComponent(decodeRouteSlug(slug))}/${encodeURIComponent(decodeRouteSlug(subpage))}` !== `/${data.post.slug}`) permanentRedirect(`/${data.post.slug}`)
    return (
        <Container fullWidth={data.post.fullWidth} postTitle={data.post.title} cover={getArticleCover(data.recordMap, data.post.id)}>
            <EntryContent post={data.post} emailHash="">
                <Suspense fallback={null}>
                    <EntryBody post={data.post} recordMap={data.recordMap} pageHrefMap={data.pageHrefMap}>
                        <PostNav kind="sub" homeHref={data.parentHref} />
                    </EntryBody>
                </Suspense>
            </EntryContent>
        </Container>
    )
}
