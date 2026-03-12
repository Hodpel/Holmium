'use client'

import { forwardRef, useCallback, useEffect, useRef, useState, MouseEvent } from 'react'
import { useMedia } from 'react-use'
import Link from 'next/link'
import Image from 'next/image'
import { config } from '@/blog.config'
import { HomeIcon, TrashIcon, CloudIcon, LinkIcon, SearchIcon, ScrollUpIcon } from '@/components/Icons'

type NavLink = {
    id: number
    name: string
    icon?: React.ReactNode
    to: string
    show: boolean
    external?: boolean
}

const NavBar = () => {
    // const locale = useLocale()
    const links: NavLink[] = [
        { id: 0, name: '首页', icon: <HomeIcon />, to: config.path || '/', show: true },
        { id: 1, name: '废纸篓', icon: <TrashIcon />, to: '/废纸篓', show: true },
        { id: 2, name: '云', icon: <CloudIcon />, to: 'https://cloud.hodpel.eu.org/', show: true },
        { id: 3, name: '短链', icon: <LinkIcon />, to: 'https://s.hodpel.eu.org/', show: true },
        // { id: 4, name: locale.NAV.RSS, to: '/feed', show: false },
        { id: 5, name: '搜索', icon: <SearchIcon />, to: '/search', show: true },
    ]
    return (
        <div className="shrink-0">
            <ul className="flex flex-row">
                {links.map(
                    (link) =>
                        link.show && (
                            <li key={link.id} className="block ml-4 text-black dark:text-gray-50 nav" title={link.name}>
                                <Link href={link.to} target={link.external ? '_blank' : undefined}>
                                    {link.icon ?? link.name}
                                </Link>
                            </li>
                        )
                )}
            </ul>
        </div>
    )
}

export default function Header() {
    // const BLOG = useConfig()
    // const { dark } = useTheme()
    // const { postTitle, fullWidth } = useHeader()
    const prefersDark = useMedia('(prefers-color-scheme: dark)', false)
    const dark = config.appearance === 'dark' || (config.appearance === 'auto' && prefersDark)
    const fullWidth = false
    const postTitle = ''

    useEffect(() => {
        // Only decide color scheme after initial loading, i.e. when `dark` is really representing a
        // media query result
        if (typeof dark === 'boolean') {
            document.documentElement.classList.toggle('dark', dark)
            document.documentElement.classList.remove('color-scheme-unset')
        }
    }, [dark])

    // Favicon
    const favicon = '/favicon.ico'

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

    const titleRef = useRef<HTMLParagraphElement | null>(null)

    const handleClickHeader = (ev: MouseEvent<HTMLDivElement>) => {
        const target = ev.target as HTMLElement

        // 检查 target 是否是 navRef.current 或 titleRef.current 或它们的子元素
        if (navRef.current?.contains(target) || titleRef.current?.contains(target)) {
            window.scrollTo({
                top: 0,
                behavior: 'smooth',
            })
        }
    }

    return (
        <>
            <div className="observer-element h-4 md:h-12" ref={sentinelRef} />

            <div
                className={`sticky-nav group m-auto w-full h-6 flex flex-row justify-between items-center mb-2 md:mb-12 py-8 px-4 ${fullWidth ? 'sticky-nav-fullwidth' : ''}`}
                id="sticky-nav"
                ref={navRef}
                onClick={handleClickHeader}
            >
                <ScrollUpIcon />

                <div className="flex items-center">
                    <Link href="/" aria-label={config.title}>
                        <Image src="/favicon.ico" width={32} height={32} alt={config.title} />
                    </Link>

                    <HeaderName ref={titleRef} siteTitle={config.title} siteDescription={config.description} postTitle={postTitle} onClick={handleClickHeader} />
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
    onClick: (e: MouseEvent<HTMLDivElement>) => void
}

const HeaderName = forwardRef<HTMLParagraphElement, HeaderNameProps>(function HeaderName({ siteTitle, siteDescription, postTitle, onClick }, ref) {
    return (
        <p ref={ref} className="header-name ml-2 font-medium text-gray-600 dark:text-gray-300 capture-pointer-events grid-rows-1 grid-cols-1 items-center" onClick={onClick}>
            {postTitle && <span className="post-title row-start-1 col-start-1">{postTitle}</span>}
            <span className="row-start-1 col-start-1">
                <span className="site-title">{siteTitle}</span>
                {siteDescription && <span className="site-description font-normal">, {siteDescription}</span>}
            </span>
        </p>
    )
})
