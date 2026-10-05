'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { MouseEvent, PointerEvent, ReactNode } from 'react'

import { ArrowLeftIcon, ChevronUpIcon } from '@/components/Icons'
import SmoothLink from '@/components/SmoothLink'
import locale from '@/lib/locale'
import type { BlogEntrySummary } from '@/lib/blog/types'
import { clearPostOrigin, consumePostOrigin, rememberPostOrigin } from '@/lib/navigation/post-origin'
import { navigateToPageTop, scrollToPageTop } from '@/lib/navigation/scroll'

export function PostEntryLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
    return (
        <Link
            className={`holmium-post-entry-link ${className}`.trim()}
            scroll={false}
            href={href}
            onPointerDown={(event: PointerEvent<HTMLAnchorElement>) => {
                if (
                    event.defaultPrevented ||
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                ) {
                    return
                }

                rememberPostOrigin(href)
            }}
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                if (
                    event.defaultPrevented ||
                    event.detail !== 0 ||
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                ) {
                    return
                }

                rememberPostOrigin(href)
            }}
            onNavigate={() => {
                scrollToPageTop()
            }}
        >
            {children}
        </Link>
    )
}

export function PostNav({ kind, homeHref }: { kind: BlogEntrySummary['kind']; homeHref: string }) {
    const router = useRouter()

    return (
        <div className="flex font-medium justify-between my-5">
            {kind === 'post' ? (
                <Link
                    scroll={false}
                    href={homeHref}
                    onNavigate={(event) => {
                        const origin = consumePostOrigin()
                        const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
                        const canReturn = origin?.target === current

                        if (canReturn) {
                            event.preventDefault()
                            navigateToPageTop(() => router.replace(origin.source, { scroll: false }))
                        } else {
                            clearPostOrigin()
                            scrollToPageTop()
                        }
                    }}
                    className="holmium-text-nav-control mt-2"
                >
                    <ArrowLeftIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    {locale.POST.BACK}
                </Link>
            ) : (
                <SmoothLink
                    href={homeHref}
                    className="holmium-text-nav-control mt-2"
                >
                    <ArrowLeftIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    {kind === 'sub' ? locale.POST.BACK : locale.POST.HOME}
                </SmoothLink>
            )}

            <button
                onClick={scrollToPageTop}
                className="holmium-text-nav-control mt-2"
            >
                <ChevronUpIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {locale.POST.TOP}
            </button>
        </div>
    )
}
