import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import config from '@/blog.config'
import advancedConfig from '@/config/blog.advanced'
import Container from '@/components/Container'
import ContentTransition from '@/components/ContentTransition'
import SmoothForm from '@/components/SmoothForm'
import { Pagination } from '@/components/ContextNav'
import PostItem from '@/components/entry/PostItem'
import { buildRobotsMetadata } from '@/lib/metadata/robots'
import { buildSiteUrl } from '@/lib/metadata/site-url'
import { paginate, parsePageNumber } from '@/lib/blog/pagination'
import { buildSearchHref, MAX_SEARCH_QUERY_LENGTH, normalizeSearchQuery, searchBlogEntries } from '@/lib/blog/search'
import locale from '@/lib/locale'
import getPostsList from '@/lib/notion/getPostsList'

const searchIndexing = config.seo.indexing && advancedConfig.seo.indexSearchResults

export const metadata: Metadata = {
    alternates: {
        canonical: buildSiteUrl(config.siteUrl, '/search'),
    },
    robots: buildRobotsMetadata(searchIndexing, advancedConfig.seo.robots),
}

type SearchParams = Promise<{
    q?: string | string[]
    page?: string | string[]
}>

function readSingleValue(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) return value.length === 1 ? value[0] ?? '' : null
    return value ?? ''
}

async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams
    const rawQuery = readSingleValue(params.q)
    const rawPage = readSingleValue(params.page)
    if (rawQuery === null || rawPage === null) notFound()

    const query = normalizeSearchQuery(rawQuery, config.locale)
    const page = rawPage ? parsePageNumber(rawPage) : 1
    if (page === null) notFound()

    const postsList = await getPostsList({ includePages: false })
    const matches = searchBlogEntries(postsList, query, config.locale)
    const results = paginate(matches, page, config.postsPerPage)
    if (!results) notFound()

    return (
        <ContentTransition transitionKey={JSON.stringify([query, results.page])}>
            <SmoothForm action="/search" className="mb-8 flex gap-3" role="search">
                <input
                    type="search"
                    name="q"
                    defaultValue={query}
                    maxLength={MAX_SEARCH_QUERY_LENGTH}
                    aria-label={locale.NAV.SEARCH}
                    placeholder={locale.NAV.SEARCH}
                    className="search-field min-w-0 flex-1 rounded-md border border-gray-300 bg-transparent px-3 py-2 text-gray-600 dark:border-gray-600 dark:text-gray-300"
                />
                <button type="submit" className="holmium-search-submit rounded-md bg-theme px-4 py-2 text-white">
                    {locale.NAV.SEARCH}
                </button>
            </SmoothForm>

            {results.items.length > 0 ? (
                results.items.map((post) => <PostItem key={post.id} post={post} />)
            ) : (
                <p className="py-12 text-center text-gray-500 dark:text-gray-400">{locale.PAGE.ERROR_404.MESSAGE}</p>
            )}

            {(results.hasPrevious || results.hasNext) && (
                <Pagination
                    page={results.page}
                    hasNext={results.hasNext}
                    hrefForPage={(targetPage) => buildSearchHref(query, targetPage)}
                />
            )}
        </ContentTransition>
    )
}

export default function Search({ searchParams }: { searchParams: SearchParams }) {
    return (
        <Container>
            <Suspense fallback={<div className="min-h-40" aria-busy="true" />}>
                <SearchResults searchParams={searchParams} />
            </Suspense>
        </Container>
    )
}
