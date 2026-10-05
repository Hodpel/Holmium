'use client'

import Image from 'next/image'
import type { BlogEntrySummary } from '@/lib/blog/types'
import { resolvePageIconSource } from '@/lib/blog/pageIcon'
import { useResolvedTheme } from '@/components/ThemeRuntime'

export default function PageIcon({ post }: { post: BlogEntrySummary }) {
    const theme = useResolvedTheme()
    const icon = post.icon ?? { kind: 'emoji' as const, value: '✍️' }

    if (icon.kind === 'emoji') {
        return <span className="text-3xl">{icon.value}</span>
    }

    const iconSource = icon.src
    const notionHost = process.env.NEXT_PUBLIC_NOTION_HOST || 'www.notion.so'
    const res = resolvePageIconSource(iconSource, post.id, theme, notionHost)
    if (!res) return null
    const isSvg = res.split('?')[0]?.endsWith('.svg') ?? false

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
