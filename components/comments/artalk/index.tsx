'use client'

import Artalk from 'artalk'
import 'artalk/Artalk.css'
import { useEffect, useRef } from 'react'

import { useResolvedTheme } from '@/components/ThemeRuntime'
import { installArtalkMotion } from './motion'

import './styles.css'

interface ArtalkCommentsProps {
    pageKey: string
    pageTitle: string
    locale: string
    server: string
    site: string
    accentColor: string
    lightBackground: string
    darkBackground: string
}

function resolveArtalkLocale(locale: string): string {
    const normalized = locale.replace('_', '-').toLowerCase()
    if (normalized.startsWith('zh')) return 'zh-CN'
    if (normalized.startsWith('en')) return 'en-US'
    return 'en'
}

export default function ArtalkComments({
    pageKey,
    pageTitle,
    locale,
    server,
    site,
    accentColor,
    lightBackground,
    darkBackground,
}: ArtalkCommentsProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const instanceRef = useRef<ReturnType<typeof Artalk.init> | null>(null)
    const theme = useResolvedTheme()

    useEffect(() => {
        const root = document.documentElement
        const variables = {
            '--holmium-comment-accent': accentColor,
            '--holmium-comment-light-bg': lightBackground,
            '--holmium-comment-dark-bg': darkBackground,
        }
        const previousValues = Object.fromEntries(
            Object.keys(variables).map((name) => [name, root.style.getPropertyValue(name)])
        )

        for (const [name, value] of Object.entries(variables)) root.style.setProperty(name, value)

        return () => {
            for (const [name, value] of Object.entries(previousValues)) {
                if (value) root.style.setProperty(name, value)
                else root.style.removeProperty(name)
            }
        }
    }, [accentColor, darkBackground, lightBackground])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const body = document.body
        const stableGutterClass = 'holmium-artalk-stable-gutter'
        const bodyHadStableGutterClass = body.classList.contains(stableGutterClass)
        const previousBodyPaddingVariable = body.style.getPropertyValue('--holmium-body-padding-right')
        body.style.setProperty('--holmium-body-padding-right', getComputedStyle(body).paddingRight)
        body.classList.add(stableGutterClass)

        // Artalk fetches remote configuration during initialization. That request
        // can finish after React's development-mode effect cleanup, so give every
        // instance its own disposable mount node instead of reusing the wrapper.
        const mount = document.createElement('div')
        container.replaceChildren(mount)
        const instance = Artalk.init({
            el: mount,
            pageKey,
            pageTitle,
            server: server.replace(/\/+$/, ''),
            site,
            locale: resolveArtalkLocale(locale),
            darkMode: document.documentElement.classList.contains('dark'),
            preferRemoteConf: true,
        })
        instanceRef.current = instance
        const removeMotion = installArtalkMotion(mount)

        return () => {
            removeMotion()
            instance.destroy()
            mount.remove()
            if (!bodyHadStableGutterClass) body.classList.remove(stableGutterClass)
            if (previousBodyPaddingVariable)
                body.style.setProperty('--holmium-body-padding-right', previousBodyPaddingVariable)
            else body.style.removeProperty('--holmium-body-padding-right')
            if (instanceRef.current === instance) instanceRef.current = null
        }
    }, [locale, pageKey, pageTitle, server, site])

    useEffect(() => {
        instanceRef.current?.setDarkMode(theme === 'dark')
    }, [theme])

    return (
        <section id="comments_thread" className="artalk-comments my-5" aria-label="评论">
            <div ref={containerRef} />
        </section>
    )
}
