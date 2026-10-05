'use client'

import type { CSSProperties, MouseEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useArticleProgress } from '@/components/entry/ProgressiveArticle'
import { ANCHOR_REVEAL_EVENT } from '@/lib/navigation/anchorReveal'

export type FloatingTableOfContentsEntry = {
    id: string
    indentLevel: number
    text: string
}

type TableOfContentsPreview = {
    index: number
    offset: number
    visible: boolean
}

const PREVIEW_EXIT_DURATION = 180

function findHeading(id: string): HTMLElement | null {
    return (
        document.getElementById(id) ??
        document.querySelector<HTMLElement>(`.notion-h[data-id="${CSS.escape(id)}"]`)
    )
}

export default function FloatingTableOfContents({ entries }: { entries: readonly FloatingTableOfContentsEntry[] }) {
    const progress = useArticleProgress()
    const [activeId, setActiveId] = useState(entries[0]?.id ?? null)
    const [preview, setPreview] = useState<TableOfContentsPreview | null>(null)
    const tocRef = useRef<HTMLElement | null>(null)
    const pointerYRef = useRef<number | null>(null)
    const previewFrameRef = useRef<number | null>(null)
    const previewHideTimerRef = useRef<number | null>(null)
    const previewEnterFrameRef = useRef<number | null>(null)
    const previewRowRef = useRef<HTMLDivElement | null>(null)
    const [previewOverflow, setPreviewOverflow] = useState(0)

    useEffect(() => {
        const headings = entries.flatMap((entry) => {
            const element = findHeading(entry.id)
            return element ? [{ element, id: entry.id }] : []
        })
        if (headings.length === 0) return

        const updateActiveHeading = () => {
            const activationLine = Math.min(144, window.innerHeight * 0.24)
            let nextActiveId = headings[0].id

            for (const heading of headings) {
                if (heading.element.getBoundingClientRect().top > activationLine) break
                nextActiveId = heading.id
            }

            if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
                nextActiveId = headings.at(-1)?.id ?? nextActiveId
            }

            setActiveId((currentId) => (currentId === nextActiveId ? currentId : nextActiveId))
        }

        const observer = new IntersectionObserver(updateActiveHeading, {
            rootMargin: '-96px 0px -68% 0px',
            threshold: [0, 1],
        })
        headings.forEach(({ element }) => observer.observe(element))
        updateActiveHeading()

        return () => observer.disconnect()
    }, [entries, progress?.end])

    const scrollToHeading = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
        event.preventDefault()
        window.dispatchEvent(new CustomEvent(ANCHOR_REVEAL_EVENT, { detail: { id } }))
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${id}`)
        setActiveId(id)
        window.requestAnimationFrame(() => {
            const heading = findHeading(id)
            if (!heading) return
            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            heading.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
        })
    }

    const showPreview = (element: HTMLElement, index: number) => {
        const bounds = element.getBoundingClientRect()
        const rowHeight = parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.25
        const offset = bounds.top + bounds.height / 2 - (index + 0.5) * rowHeight
        if (preview?.index !== index) setPreviewOverflow(0)
        if (previewHideTimerRef.current !== null) {
            window.clearTimeout(previewHideTimerRef.current)
            previewHideTimerRef.current = null
        }
        setPreview((current) => {
            if (current?.index === index && Math.abs(current.offset - offset) < 1) {
                return current.visible ? current : { ...current, visible: true }
            }
            return { index, offset, visible: current !== null }
        })

        if (preview === null && previewEnterFrameRef.current === null) {
            previewEnterFrameRef.current = window.requestAnimationFrame(() => {
                previewEnterFrameRef.current = null
                setPreview((current) => (current ? { ...current, visible: true } : current))
            })
        }
    }

    const hidePreview = () => {
        if (!preview) return
        if (previewEnterFrameRef.current !== null) {
            window.cancelAnimationFrame(previewEnterFrameRef.current)
            previewEnterFrameRef.current = null
        }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setPreview(null)
            return
        }

        setPreview((current) => (current ? { ...current, visible: false } : null))
        if (previewHideTimerRef.current !== null) window.clearTimeout(previewHideTimerRef.current)
        previewHideTimerRef.current = window.setTimeout(() => {
            previewHideTimerRef.current = null
            setPreview(null)
        }, PREVIEW_EXIT_DURATION)
    }

    const handleMouseMove = (event: MouseEvent<HTMLElement>) => {
        pointerYRef.current = event.clientY
        if (previewFrameRef.current !== null) return

        previewFrameRef.current = window.requestAnimationFrame(() => {
            previewFrameRef.current = null
            const toc = tocRef.current
            const pointerY = pointerYRef.current
            if (!toc || pointerY === null) return

            const links = [...toc.querySelectorAll<HTMLAnchorElement>('.holmium-floating-toc-link')]
            if (links.length === 0) return

            let nearestLink = links[0]
            let nearestIndex = 0
            let nearestDistance = Number.POSITIVE_INFINITY
            links.forEach((link, index) => {
                const bounds = link.getBoundingClientRect()
                const distance = Math.abs(pointerY - (bounds.top + bounds.height / 2))
                if (distance < nearestDistance) {
                    nearestLink = link
                    nearestIndex = index
                    nearestDistance = distance
                }
            })
            showPreview(nearestLink, nearestIndex)
        })
    }

    useEffect(
        () => () => {
            if (previewFrameRef.current !== null) window.cancelAnimationFrame(previewFrameRef.current)
            if (previewEnterFrameRef.current !== null) window.cancelAnimationFrame(previewEnterFrameRef.current)
            if (previewHideTimerRef.current !== null) window.clearTimeout(previewHideTimerRef.current)
        },
        [],
    )

    const previewIndex = preview?.index ?? null

    useEffect(() => {
        if (previewIndex === null) return

        const frame = window.requestAnimationFrame(() => {
            const row = previewRowRef.current
            setPreviewOverflow(row ? Math.max(0, row.scrollWidth - row.clientWidth) : 0)
        })

        return () => window.cancelAnimationFrame(frame)
    }, [previewIndex])

    return (
        <>
            <nav
                aria-label="Table of contents"
                className="holmium-floating-toc"
                ref={tocRef}
                onMouseLeave={hidePreview}
                onMouseMove={handleMouseMove}
            >
                <ol className="holmium-floating-toc-list">
                    {entries.map((entry, index) => {
                        const isActive = entry.id === activeId
                        const markerWidth = 14 - Math.min(entry.indentLevel, 3) * 2
                        const style = { '--toc-marker-width': `${markerWidth}px` } as CSSProperties

                        return (
                            <li key={entry.id} style={style}>
                                <a
                                    aria-current={isActive ? 'location' : undefined}
                                    aria-label={entry.text}
                                    className="holmium-floating-toc-link"
                                    href={`#${entry.id}`}
                                    onBlur={hidePreview}
                                    onClick={(event) => scrollToHeading(event, entry.id)}
                                    onFocus={(event) => showPreview(event.currentTarget, index)}
                                >
                                    <span aria-hidden="true" className="holmium-floating-toc-marker" />
                                </a>
                            </li>
                        )
                    })}
                </ol>
            </nav>
            {preview && (
                <div
                    aria-hidden="true"
                    className={`holmium-floating-toc-preview${preview.visible ? ' is-visible' : ''}`}
                >
                    <div
                        className="holmium-floating-toc-preview-track"
                        style={{ '--toc-preview-shift': `${preview.offset}px` } as CSSProperties}
                    >
                        {entries.map((entry, index) => (
                            <div
                                className={`holmium-floating-toc-preview-row ${
                                    index === preview.index
                                        ? `is-active${previewOverflow > 0 ? ' is-overflowing' : ''}`
                                        : Math.abs(index - preview.index) === 1
                                          ? 'is-adjacent'
                                          : Math.abs(index - preview.index) === 2
                                            ? 'is-secondary'
                                            : 'is-faded'
                                }`}
                                key={entry.id}
                                ref={index === preview.index ? previewRowRef : undefined}
                                style={
                                    index === preview.index
                                        ? ({ '--toc-marquee-distance': `-${previewOverflow}px` } as CSSProperties)
                                        : undefined
                                }
                            >
                                <span className="holmium-floating-toc-preview-text">{entry.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}
