'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { ChevronDownIcon } from '@/components/Icons'
import { PostEntryLink } from '@/components/entry/EntryNavigation'
import { getSummaryViewport } from '@/lib/navigation/summaryViewport'

const fallbackLineHeight = 32

interface ExpandablePostEntryProps {
    href: string
    summaryText: string | null
    icon: ReactNode
    header: ReactNode
    summary: ReactNode
    expandLabel: string
    collapseLabel: string
}

type SummaryMeasurement = {
    fullHeight: number
    lineHeight: number
}

export default function ExpandablePostEntry({
    href,
    summaryText,
    icon,
    header,
    summary,
    expandLabel,
    collapseLabel,
}: ExpandablePostEntryProps) {
    const [expanded, setExpanded] = useState(false)
    const [hasInteracted, setHasInteracted] = useState(false)
    const [measurement, setMeasurement] = useState<SummaryMeasurement | null>(null)
    const summaryId = useId()
    const summaryRef = useRef<HTMLParagraphElement | null>(null)
    const reduceMotion = useReducedMotion()

    const measureSummary = useCallback((summaryElement: HTMLParagraphElement) => {
        const next = {
            fullHeight: summaryElement.scrollHeight,
            lineHeight: Number.parseFloat(getComputedStyle(summaryElement).lineHeight) || fallbackLineHeight,
        }
        setMeasurement(current => current?.fullHeight === next.fullHeight && current.lineHeight === next.lineHeight ? current : next)
    }, [])

    const attachSummary = useCallback((summaryElement: HTMLParagraphElement | null) => {
        summaryRef.current = summaryElement
        if (summaryElement) measureSummary(summaryElement)
    }, [measureSummary])

    useLayoutEffect(() => {
        const summaryElement = summaryRef.current
        if (!summaryElement) return

        const observer = new ResizeObserver(() => measureSummary(summaryElement))
        observer.observe(summaryElement)
        return () => observer.disconnect()
    }, [measureSummary])

    const viewport = measurement
        ? getSummaryViewport(measurement.fullHeight, measurement.lineHeight, expanded)
        : null
    const canExpand = viewport?.canExpand ?? false
    const viewportHeight = viewport?.targetHeight ?? 'auto'
    const transition = reduceMotion
        ? { duration: 0 }
        : { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }

    return (
        <article className="holmium-post-entry relative mb-6 md:mb-8">
            <PostEntryLink href={href}>
                <div className="holmium-post-entry-main flex flex-row gap-4 items-start">
                    <div className="relative h-9 w-9 shrink-0 mt-2 md:mt-0">
                        {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        {header}
                        {summaryText && (
                            <div className="hidden min-h-16 md:block">
                                <motion.div
                                    className={`overflow-hidden ${hasInteracted ? '' : 'max-h-24'}`}
                                    initial={false}
                                    animate={{ height: viewportHeight }}
                                    transition={hasInteracted ? transition : { duration: 0 }}
                                >
                                    <p
                                        ref={attachSummary}
                                        id={summaryId}
                                        className="whitespace-pre-line leading-8 [overflow-wrap:anywhere] text-gray-700 dark:text-gray-300"
                                        title={summaryText}
                                    >
                                        {summary}
                                    </p>
                                </motion.div>
                            </div>
                        )}
                    </div>
                </div>
            </PostEntryLink>
            <AnimatePresence initial={false}>
                {canExpand && (
                    <motion.div
                        className="holmium-summary-toggle absolute bottom-0 right-0 hidden items-center justify-end pointer-events-none md:flex"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.16, ease: 'easeOut' }}
                    >
                        <motion.button
                            type="button"
                            aria-controls={summaryId}
                            aria-expanded={expanded}
                            aria-label={expanded ? collapseLabel : expandLabel}
                            title={expanded ? collapseLabel : expandLabel}
                            onClick={() => {
                                setHasInteracted(true)
                                setExpanded(current => !current)
                            }}
                            className="holmium-summary-toggle-control holmium-metadata-control pointer-events-auto inline-flex h-6 cursor-pointer items-center justify-center rounded px-1 text-gray-500 dark:text-gray-400"
                        >
                            <ChevronDownIcon
                                aria-hidden="true"
                                className={`h-3 w-3 transition-transform duration-300 ease-out motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
                            />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </article>
    )
}
