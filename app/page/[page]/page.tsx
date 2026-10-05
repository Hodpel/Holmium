// 配置文件
import config from '@/blog.config'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

// 工具
import getPostsList from '@/lib/notion/getPostsList'
import { paginate, parsePageNumber } from '@/lib/blog/pagination'
import { buildSiteUrl } from '@/lib/metadata/site-url'

// 通用组件
import Container from '@/components/Container'

// 具体组件
import { Pagination } from '@/components/ContextNav'
import PostItem from '@/components/entry/PostItem'

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
    const { page: rawPage } = await params
    const page = parsePageNumber(rawPage)
    if (page === null) return {}

    return {
        alternates: {
            canonical: buildSiteUrl(config.siteUrl, page === 1 ? '/' : `/page/${page}`),
        },
    }
}

export async function generateStaticParams(): Promise<{ page: string }[]> {
    const posts = await getPostsList({ includePages: false })
    const pageCount = Math.max(1, Math.ceil(posts.length / config.postsPerPage))

    // Include /page/1 so its permanent redirect is also a build artifact.
    return Array.from({ length: pageCount }, (_, index) => ({ page: String(index + 1) }))
}

export default async function PaginatedBlog({ params }: { params: Promise<{ page: string }> }) {
    const { page: rawPage } = await params
    const page = parsePageNumber(rawPage)
    if (page === null) notFound()
    if (page === 1) permanentRedirect(config.path || '/')

    const postsList = await getPostsList({ includePages: false })
    const currentPage = paginate(postsList, page, config.postsPerPage)
    if (!currentPage) notFound()

    return (
        <Container>
            {currentPage.items.map((post) => (
                <PostItem key={post.id} post={post} />
            ))}
            <Pagination page={currentPage.page} hasNext={currentPage.hasNext} />
        </Container>
    )
}
