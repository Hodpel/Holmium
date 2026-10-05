'use client'

import { createContext, startTransition, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { useIsPresent } from 'motion/react'
import type { ExtendedRecordMap } from 'notion-types'
import { planRenderBatches, type RenderBatchPlan } from '@/lib/notion/renderBatches'
import { usePageEntrance } from '@/components/navigation/PageEntrance'

const ProgressContext = createContext<{ plan: RenderBatchPlan; end: number } | null>(null)
export const useArticleProgress = () => useContext(ProgressContext)

const subscribe = () => () => {}
const clientSnapshot = () => false
const serverSnapshot = () => true

export default function ProgressiveArticle({ recordMap, children, footer }: {
    recordMap: ExtendedRecordMap
    children: ReactNode
    footer: ReactNode
}) {
    const plan = useMemo(() => planRenderBatches(recordMap), [recordMap])
    const hydrating = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot)
    // Freeze the initial choice: hydration must never hide existing server HTML.
    // A new article is keyed by page ID; only client navigation starts in batches.
    const [end, setEnd] = useState(() => hydrating || window.location.hash ? plan.content.length : plan.ends[0])
    const progress = useMemo(() => ({ plan, end }), [plan, end])
    const complete = end >= plan.content.length
    const { ready, revealNow } = usePageEntrance()
    const present = useIsPresent()

    useEffect(() => {
        if (ready || !present) return
        const onWheel = (event: WheelEvent) => { if (event.deltaY > 0) revealNow() }
        const onKey = (event: KeyboardEvent) => {
            if ((event.target as Element)?.closest('input, textarea, select, [contenteditable="true"]')) return
            if (['ArrowDown', 'PageDown', 'End', ' '].includes(event.key)) revealNow()
        }
        window.addEventListener('wheel', onWheel, { passive: true })
        window.addEventListener('touchmove', revealNow, { passive: true })
        window.addEventListener('keydown', onKey)
        return () => {
            window.removeEventListener('wheel', onWheel)
            window.removeEventListener('touchmove', revealNow)
            window.removeEventListener('keydown', onKey)
        }
    }, [ready, present, revealNow])

    useEffect(() => {
        if (complete || !ready || !present) return
        let task: ReturnType<typeof setTimeout> | undefined
        // Let the committed batch paint before scheduling more React work. This
        // yields to the browser, not to a fixed entrance-animation duration.
        const frame = requestAnimationFrame(() => {
            task = setTimeout(() => {
                startTransition(() => setEnd(current => plan.ends.find(next => next > current) ?? current))
            }, 0)
        })
        return () => {
            cancelAnimationFrame(frame)
            clearTimeout(task)
        }
    }, [complete, end, plan, ready, present])

    useEffect(() => {
        const revealHash = () => {
            let id: string
            try { id = decodeURIComponent(window.location.hash.slice(1)).replaceAll('-', '') } catch { return }
            const required = plan.targetEnds.get(id)
            if (!required || required <= end) return
            revealNow()
            flushSync(() => setEnd(required))
            document.getElementById(id)?.scrollIntoView({ block: 'start' })
        }
        window.addEventListener('hashchange', revealHash)
        return () => window.removeEventListener('hashchange', revealHash)
    }, [end, plan, revealNow])

    return (
        <ProgressContext.Provider value={progress}>
            <div className="contents" onClickCapture={event => {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]')
                if (!link || link.target === '_blank' || link.hasAttribute('download')) return
                const url = new URL(link.href)
                if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return
                let id: string
                try { id = decodeURIComponent(url.hash.slice(1)).replaceAll('-', '') } catch { return }
                const required = plan.targetEnds.get(id)
                // Mount before either the TOC's own handler or native hash navigation.
                if (required && required > end) flushSync(() => { revealNow(); setEnd(required) })
            }}>
                {children}
                {complete && footer}
            </div>
        </ProgressContext.Provider>
    )
}
