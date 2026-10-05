// 配置文件
import config from '@/blog.config'
import type { Metadata } from 'next'

// 工具
import getPostsList from '@/lib/notion/getPostsList'
import { paginate } from '@/lib/blog/pagination'
import { buildSiteUrl } from '@/lib/metadata/site-url'
import { homeSocialCardPath, socialCardSize } from '@/lib/metadata/social-card-config'

// 通用组件
import Container from '@/components/Container'

// 具体组件
import { Pagination } from '@/components/ContextNav'
import PostItem from '@/components/entry/PostItem'

const homeImage = { url: buildSiteUrl(config.siteUrl, homeSocialCardPath), ...socialCardSize, alt: `${config.title} 分享卡片` }
const socialMetadata = { title: config.title, description: config.description || undefined, images: [homeImage] }

export const metadata: Metadata = {
    openGraph: {
        ...socialMetadata,
        type: 'website',
        url: buildSiteUrl(config.siteUrl),
    },
    twitter: {
        ...socialMetadata,
        card: 'summary_large_image',
    },
    alternates: {
        canonical: buildSiteUrl(config.siteUrl),
    },
}

export default async function Blog() {
    const postsList = await getPostsList({ includePages: false })
    const firstPage = paginate(postsList, 1, config.postsPerPage)
    if (!firstPage) throw new Error('The first blog page must always be available.')

    return (
        <Container>
            {firstPage.items.map((post) => (
                <PostItem key={post.id} post={post} />
            ))}
            {firstPage.hasNext && <Pagination page={firstPage.page} hasNext={firstPage.hasNext} />}
        </Container>
    )
}
