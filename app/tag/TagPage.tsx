import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import config from '@/blog.config'
import Container from '@/components/Container'
import { Pagination } from '@/components/ContextNav'
import PostItem from '@/components/entry/PostItem'
import { paginate, parsePageNumber } from '@/lib/blog/pagination'
import { buildTagHref, filterBlogEntriesByTag, parseTagRouteSegment } from '@/lib/blog/tags'
import locale from '@/lib/locale'
import { buildSiteUrl } from '@/lib/metadata/site-url'
import getPostsList from '@/lib/notion/getPostsList'

type TagRouteParams = Promise<{
    tag: string
    page?: string
}>

export async function generateTagMetadata(params: TagRouteParams, paginated = false): Promise<Metadata> {
    const { tag: rawTag, page: rawPage } = await params
    const tag = parseTagRouteSegment(rawTag)
    if (tag === null) return {}

    const page = paginated && rawPage ? parsePageNumber(rawPage) : 1
    if (page === null) return {}

    return {
        alternates: {
            canonical: buildSiteUrl(config.siteUrl, buildTagHref(tag, page)),
        },
    }
}

async function TagResults({ params, paginated }: { params: TagRouteParams; paginated: boolean }) {
    const { tag: rawTag, page: rawPage } = await params
    const tag = parseTagRouteSegment(rawTag)
    if (tag === null) notFound()

    const page = paginated && rawPage ? parsePageNumber(rawPage) : 1
    if (page === null) notFound()
    if (paginated && page === 1) permanentRedirect(buildTagHref(tag))

    const postsList = await getPostsList({ includePages: false })
    const taggedPosts = filterBlogEntriesByTag(postsList, tag)
    if (taggedPosts.length === 0) notFound()

    const results = paginate(taggedPosts, page, config.postsPerPage)
    if (!results) notFound()

    return (
        <>
            <header className="mb-8 flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-2 border-b border-gray-200/80 pb-4 dark:border-gray-700/80">
                <h1 className="flex min-w-0 items-baseline text-2xl font-bold text-black dark:text-white md:text-3xl">
                    <span aria-hidden="true" className="mr-1 shrink-0 font-medium text-theme">
                        #
                    </span>
                    <span className="min-w-0 [overflow-wrap:anywhere]">{tag}</span>
                </h1>
                <p className="ml-auto shrink-0 text-sm leading-none text-gray-500 dark:text-gray-400">
                    {locale.TAG_PAGE.POSTS} · {taggedPosts.length}
                </p>
            </header>

            {results.items.map((post) => (
                <PostItem key={post.id} post={post} />
            ))}

            {(results.hasPrevious || results.hasNext) && (
                <Pagination
                    page={results.page}
                    hasNext={results.hasNext}
                    hrefForPage={(targetPage) => buildTagHref(tag, targetPage)}
                />
            )}
        </>
    )
}

export default function TagPage({ params, paginated = false }: { params: TagRouteParams; paginated?: boolean }) {
    return (
        <Container>
            <TagResults params={params} paginated={paginated} />
        </Container>
    )
}
