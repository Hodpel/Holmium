'use client'

import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useSyncExternalStore } from 'react'

import type { Config } from '@/lib/types'

export type ResolvedTheme = 'light' | 'dark'

const AppearanceContext = createContext<Config['appearance']>('auto')

function resolveSystemTheme(media: MediaQueryList): ResolvedTheme {
    return media.matches ? 'dark' : 'light'
}

function applyTheme(theme: ResolvedTheme, disableTransitions = false): void {
    const root = document.documentElement
    const transitionBlocker = disableTransitions ? document.createElement('style') : null

    if (transitionBlocker) {
        transitionBlocker.textContent = '*,*::before,*::after{transition:none!important}'
        document.head.appendChild(transitionBlocker)
    }

    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    root.style.colorScheme = theme

    if (transitionBlocker) {
        window.getComputedStyle(transitionBlocker)
        window.setTimeout(() => transitionBlocker.remove(), 1)
    }
}

function subscribeToSystemTheme(callback: () => void): () => void {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', callback)
    return () => media.removeEventListener('change', callback)
}

export function useResolvedTheme(): ResolvedTheme {
    const appearance = useContext(AppearanceContext)
    return useSyncExternalStore(
        subscribeToSystemTheme,
        () => (appearance === 'auto' ? resolveSystemTheme(window.matchMedia('(prefers-color-scheme: dark)')) : appearance),
        () => (appearance === 'dark' ? 'dark' : 'light')
    )
}

export default function ThemeRuntime({
    appearance,
    children,
}: {
    appearance: Config['appearance']
    children: ReactNode
}) {
    useEffect(() => {
        if (appearance !== 'auto') {
            applyTheme(appearance)
            return
        }

        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const updateTheme = (disableTransitions = false) => {
            applyTheme(resolveSystemTheme(media), disableTransitions)
        }
        updateTheme(false)
        const handleChange = () => updateTheme(true)
        media.addEventListener('change', handleChange)
        return () => media.removeEventListener('change', handleChange)
    }, [appearance])

    return <AppearanceContext.Provider value={appearance}>{children}</AppearanceContext.Provider>
}
