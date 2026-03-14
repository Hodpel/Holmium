'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { PageProperties } from '@/lib/types'
const { NEXT_PUBLIC_NOTION_HOST } = process.env

function isEmoji(str: string) {
    const emojiRegex =
        /[\u{1F300}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}\u{2B06}\u{2B07}\u{2B05}\u{27A1}\u{2194}-\u{2199}\u{2194}\u{21A9}\u{21AA}\u{2934}\u{2935}\u{25AA}\u{25AB}\u{25FE}\u{25FD}\u{25FB}\u{25FC}\u{25B6}\u{25C0}\u{1F200}-\u{1F251}]/u
    return emojiRegex.test(str)
}

export default function PageIcon({ post }: { post: PageProperties }) {
    const theme = useTheme().resolvedTheme || 'light'
    const icon: string = post.format.page_icon || '✍️'

    if (!icon) return null

    if (isEmoji(icon)) {
        return <span className="text-3xl">{icon}</span>
    }
    let res = null
    const isSvg = icon.endsWith('.svg')

    if (icon.startsWith('/icons/')) res = `https://${NEXT_PUBLIC_NOTION_HOST || 'www.notion.so'}${icon}?mode=${theme}`

    if (icon.startsWith('attachment')) res = `https://${NEXT_PUBLIC_NOTION_HOST || 'www.notion.so'}/image/${encodeURIComponent(post.format.page_icon)}?id=${post.id}&table=block&width=40`
    if (!res) return null

    return (
        <Image
            src={res}
            alt={`${post.title} icon`}
            fill
            className="object-cover rounded-md"
            sizes="(max-width: 768px) 64px, 80px"
            priority={false}
            unoptimized={isSvg}
            placeholder="blur"
            blurDataURL="data:image/png;base64,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"
            suppressHydrationWarning
        />
    )
}
