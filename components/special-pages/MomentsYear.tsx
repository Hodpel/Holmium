'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { ANCHOR_REVEAL_EVENT } from '@/lib/navigation/anchorReveal'
import { TimelineYear } from '@/components/special-pages/Timeline'

export default function MomentsYear({ id, initiallyOpen, children }: {
    id: string
    initiallyOpen: boolean
    children: ReactNode
}) {
    const [open, setOpen] = useState(initiallyOpen)

    useEffect(() => {
        const revealHash = () => {
            let target = ''
            try { target = decodeURIComponent(window.location.hash.slice(1)) } catch { return }
            if (target === id) setOpen(true)
        }
        const revealAnchor = (event: Event) => {
            if ((event as CustomEvent<{ id?: string }>).detail?.id === id) setOpen(true)
        }
        revealHash()
        window.addEventListener('hashchange', revealHash)
        window.addEventListener(ANCHOR_REVEAL_EVENT, revealAnchor)
        return () => {
            window.removeEventListener('hashchange', revealHash)
            window.removeEventListener(ANCHOR_REVEAL_EVENT, revealAnchor)
        }
    }, [id])

    return (
        <TimelineYear
            id={id}
            className={`holmium-moments-year${open ? ' is-open' : ''}`}
            contentClassName="holmium-moments-year-reveal"
            contentHidden={!open}
            contentId={`moments-year-${id}`}
            title={(
                <button
                    aria-controls={`moments-year-${id}`}
                    aria-expanded={open}
                    className="holmium-moments-year-toggle"
                    onClick={() => setOpen((value) => !value)}
                    type="button"
                >
                    <span aria-hidden="true" className="holmium-moments-year-indicator" />
                    <span>{id}</span>
                </button>
            )}
        >
            <div className="holmium-moments-year-clip">
                {children}
            </div>
        </TimelineYear>
    )
}
