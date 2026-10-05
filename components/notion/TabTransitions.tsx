'use client'

import React from 'react'

import { startTabPanelExit, startTabPanelTransition } from '@/lib/notion/tabTransition'

export default function TabTransitions({ children }: { children: React.ReactNode }) {
    const activeTransitions = React.useRef(new Map<HTMLElement, () => void>())
    const pendingExits = React.useRef(new Map<HTMLElement, () => void>())
    const continuingClicks = React.useRef(new WeakSet<HTMLButtonElement>())

    React.useEffect(
        () => () => {
            for (const cancel of pendingExits.current.values()) cancel()
            for (const cancel of activeTransitions.current.values()) cancel()
            pendingExits.current.clear()
            activeTransitions.current.clear()
        },
        [],
    )

    const handleClickCapture = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        if (!(event.target instanceof Element)) return

        const button = event.target.closest<HTMLButtonElement>('.notion-tab-button[role="tab"]')
        if (!button || button.getAttribute('aria-selected') === 'true') return

        const tabBlock = button.closest<HTMLElement>('.notion-tab-block')
        const panel = tabBlock?.querySelector<HTMLElement>('.notion-tab-panel')
        if (!panel) return

        if (!continuingClicks.current.has(button)) {
            event.preventDefault()
            event.stopPropagation()
            pendingExits.current.get(panel)?.()
            panel.getBoundingClientRect()
            activeTransitions.current.get(panel)?.()
            activeTransitions.current.delete(panel)
            pendingExits.current.set(
                panel,
                startTabPanelExit(panel, () => {
                    pendingExits.current.delete(panel)
                    continuingClicks.current.add(button)
                    button.click()
                }),
            )
            return
        }

        continuingClicks.current.delete(button)
        const startHeight = panel.getBoundingClientRect().height
        activeTransitions.current.get(panel)?.()
        activeTransitions.current.set(panel, startTabPanelTransition(panel, startHeight))
    }, [])

    return (
        <div className="holmium-notion-transition-root" onClickCapture={handleClickCapture}>
            {children}
        </div>
    )
}
