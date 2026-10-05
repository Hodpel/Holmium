'use client'

import { useState } from 'react'

import { SquareTextIcon } from '@/components/Icons'
import { useResolvedTheme } from '@/components/ThemeRuntime'
import { resolvePageIconSource } from '@/lib/blog/pageIcon'
import type { BlogIcon } from '@/lib/blog/types'

export default function PageMentionIcon({ icon, pageId, title }: { icon: BlogIcon; pageId: string; title: string }) {
    const [failedSrc, setFailedSrc] = useState<string>()
    const theme = useResolvedTheme()

    if (icon?.kind === 'emoji') {
        return (
            <span className="notion-page-icon-inline notion-page-icon-span">
                <span className="notion-page-title-icon notion-page-icon" role="img" aria-label={icon.value}>
                    {icon.value}
                </span>
            </span>
        )
    }

    const iconSource = icon?.kind === 'image'
        ? resolvePageIconSource(icon.src, pageId, theme, process.env.NEXT_PUBLIC_NOTION_HOST || 'www.notion.so')
        : null

    if (iconSource && failedSrc !== iconSource) {
        return (
            <span className="notion-page-icon-inline notion-page-icon-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    className="notion-page-title-icon notion-page-icon"
                    src={iconSource}
                    alt={`${title} icon`}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    ref={(image) => {
                        if (image?.complete && image.currentSrc && image.naturalWidth === 0) setFailedSrc(iconSource)
                    }}
                    onError={() => setFailedSrc(iconSource)}
                />
            </span>
        )
    }

    return (
        <span className="notion-page-icon-inline notion-page-icon-image">
            <SquareTextIcon className="notion-page-title-icon notion-page-icon" width="16" aria-hidden="true" />
        </span>
    )
}
