'use client'

import Giscus from '@giscus/react'
import type { AvailableLanguage, Repo } from '@giscus/react'
import { useSyncExternalStore } from 'react'

import { useResolvedTheme } from '@/components/ThemeRuntime'

interface GiscusCommentsProps {
    pageId: string
    locale: string
    config: {
        repo: Repo
        repoId: string
        category: string
        categoryId: string
    }
}

function resolveGiscusLanguage(locale: string): AvailableLanguage {
    const normalized = locale.replace('_', '-')
    const [language] = normalized.split('-')

    if (normalized.toLowerCase() === 'zh-cn') return 'zh-CN'
    if (normalized.toLowerCase() === 'zh-hk') return 'zh-HK'
    if (normalized.toLowerCase() === 'zh-tw') return 'zh-TW'

    if (language === 'ja' || language === 'es' || language === 'en') return language
    return 'en'
}

function subscribeToOrigin(): () => void {
    return () => undefined
}

export default function GiscusComments({ pageId, locale, config }: GiscusCommentsProps) {
    const theme = useResolvedTheme()
    const origin = useSyncExternalStore(subscribeToOrigin, () => window.location.origin, () => '')

    const giscusTheme = origin ? `${origin}/giscus-theme/${theme}.css?v=4` : theme

    return (
        <div id="comments_thread" className="my-5 font-medium text-gray-500 dark:text-gray-400">
            <Giscus
                key={pageId}
                repo={config.repo}
                repoId={config.repoId}
                category={config.category}
                categoryId={config.categoryId}
                mapping="specific"
                term={pageId}
                strict="1"
                reactionsEnabled="1"
                emitMetadata="0"
                inputPosition="top"
                theme={giscusTheme}
                lang={resolveGiscusLanguage(locale)}
                loading="lazy"
            />
        </div>
    )
}
