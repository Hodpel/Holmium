'use client'

import { useCallback, useEffect, useRef, type MouseEvent } from 'react'
import config from '@/blog.config'
import { ChevronUpIcon } from '@/components/Icons'
import HeaderLogo from '@/components/HeaderLogo'
import NavigationIcon from '@/components/NavigationIcon'
import SmoothLink from '@/components/SmoothLink'
import { scrollToPageTop } from '@/lib/navigation/scroll'
import { useHeader } from './ContextLayout'

const NavBar = () => {
    return (
        <div className="shrink-0">
            <ul className="flex flex-row">
                {config.navigation.map((item) => {
                    const href = item.href === '/' ? config.path || '/' : item.href

                    return (
                        <li key={`${item.href}:${item.label}`} className="block ml-4 text-black dark:text-gray-50 nav" title={item.label}>
                            <SmoothLink className="holmium-header-nav-link" href={href} aria-label={item.label}>
                                <NavigationIcon name={item.icon} />
                            </SmoothLink>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export default function Header() {
    const { postTitle, fullWidth } = useHeader()
    const hasHeaderLogo = Boolean(config.icons.headerLogo.trim())

    const useSticky = !config.autoCollapsedNavBar
    const navRef = useRef<HTMLDivElement | null>(null)
    const sentinelRef = useRef<HTMLDivElement | null>(null)

    const handler = useCallback(
        ([entry]: IntersectionObserverEntry[]) => {
            if (useSticky && navRef.current) {
                navRef.current.classList.toggle('sticky-nav-full', !entry.isIntersecting)
            } else {
                navRef.current?.classList.add('remove-sticky')
            }
        },
        [useSticky]
    )

    useEffect(() => {
        const sentinelEl = sentinelRef.current
        if (!sentinelEl) return

        const observer = new IntersectionObserver(handler)
        observer.observe(sentinelEl)

        return () => observer.unobserve(sentinelEl)
    }, [handler])

    const handleStickyNavClick = (event: MouseEvent<HTMLDivElement>) => {
        if (!navRef.current?.classList.contains('sticky-nav-full')) return
        if ((event.target as HTMLElement).closest('a, button, input, select, textarea')) return
        scrollToPageTop()
    }

    return (
        <>
            <div className="observer-element h-4 md:h-12" ref={sentinelRef} />

            <div
                className={`sticky-nav group m-auto w-full h-6 flex flex-row justify-between items-center mb-2 md:mb-12 py-8 px-4 ${fullWidth ? 'sticky-nav-fullwidth' : ''}`}
                id="sticky-nav"
                ref={navRef}
                onClick={handleStickyNavClick}
            >
                <ChevronUpIcon
                    aria-hidden="true"
                    className="caret pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-6 w-6 text-gray-600 dark:text-gray-300"
                />

                <div className="flex min-w-0 flex-1 items-center">
                    {hasHeaderLogo && (
                        <SmoothLink href="/" aria-label={config.title} className="holmium-header-logo-link shrink-0">
                            <HeaderLogo />
                        </SmoothLink>
                    )}

                    <HeaderName siteTitle={config.title} siteDescription={config.description} postTitle={postTitle} hasLogo={hasHeaderLogo} />
                </div>

                <NavBar />
            </div>
        </>
    )
}

type HeaderNameProps = {
    siteTitle: string
    siteDescription?: string
    postTitle?: string
    hasLogo: boolean
}

function HeaderName({ siteTitle, siteDescription, postTitle, hasLogo }: HeaderNameProps) {
    return (
        <p
            className={`header-name min-w-0 font-medium text-gray-600 dark:text-gray-300 grid-rows-1 grid-cols-1 items-center ${hasLogo ? 'ml-2' : ''}`}
        >
            {postTitle && (
                <span className="post-title row-start-1 col-start-1 truncate" title={postTitle}>
                    {postTitle}
                </span>
            )}
            <span className="row-start-1 col-start-1 min-w-0 truncate">
                <span className="site-title">{siteTitle}</span>
                {siteDescription && <span className="site-description font-normal">, {siteDescription}</span>}
            </span>
        </p>
    )
}
