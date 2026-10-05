import { notFound } from 'next/navigation'

import config from '@/blog.config'
import { renderSocialCard } from '@/lib/metadata/article-social-card'
import { socialCardContentType, socialCardSize } from '@/lib/metadata/social-card-config'
import { decodeRouteSlug } from '@/lib/navigation/route-slug'

export const alt = `${config.title} 分享卡片`
export const size = socialCardSize
export const contentType = socialCardContentType

export default async function TwitterImage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const image = await renderSocialCard(decodeRouteSlug(slug))

    if (!image) notFound()
    return image
}
