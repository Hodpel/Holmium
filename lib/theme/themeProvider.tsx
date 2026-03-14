'use client'

import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

export function Providers({ children }: { children: ReactNode }) {
    useEffect(() => {
        const handleClick = (ev: MouseEvent) => {
            const target = ev.target as HTMLElement

            const isClickable =
                target.matches(`
        a, button, input, select, textarea,
        [role="button"], [role="link"], [onclick]
      `) || target.closest('a, button, [role="button"]')

            if (isClickable) {
                window.scrollTo({ top: 0, behavior: 'smooth' })
            }
        }

        document.addEventListener('click', handleClick)
        return () => document.removeEventListener('click', handleClick)
    }, [])

    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
        </ThemeProvider>
    )
}
