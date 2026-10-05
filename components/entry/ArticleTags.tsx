'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useId, useState, type ReactNode } from 'react'

import { ChevronDownIcon } from '@/components/Icons'
import TagItem from '@/components/entry/TagItem'

const visibleTagCount = 3

interface ArticleTagsProps {
    tags: readonly string[]
    expandLabel: string
    collapseLabel: string
    children: ReactNode
}

export default function ArticleTags({ tags, expandLabel, collapseLabel, children }: ArticleTagsProps) {
    const [expanded, setExpanded] = useState(false)
    const reduceMotion = useReducedMotion()
    const overflowId = useId()
    const visibleTags = tags.slice(0, visibleTagCount)
    const overflowTags = tags.slice(visibleTagCount)
    const overflowCount = overflowTags.length
    const actionLabel = (expanded ? collapseLabel : expandLabel).replace('{count}', String(overflowCount))

    return (
        <>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                {children}
                <div className="flex max-w-full shrink-0 items-center gap-1">
                    {visibleTags.map((tag) => (
                        <TagItem key={tag} tag={tag} />
                    ))}
                    {overflowCount > 0 && (
                        <button
                            type="button"
                            aria-controls={overflowId}
                            aria-expanded={expanded}
                            aria-label={actionLabel}
                            title={actionLabel}
                            onClick={() => setExpanded((current) => !current)}
                            className="holmium-metadata-control inline-flex h-6 shrink-0 cursor-pointer items-center gap-0.5 rounded px-1 text-xs font-medium leading-none text-gray-500 dark:text-gray-400"
                        >
                            <span aria-hidden="true">{expanded ? `−${overflowCount}` : `+${overflowCount}`}</span>
                            <ChevronDownIcon
                                aria-hidden="true"
                                className={`h-3 w-3 transition-transform duration-300 ease-out motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
                            />
                        </button>
                    )}
                </div>
            </div>
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        id={overflowId}
                        className="overflow-hidden"
                        initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <div className="flex flex-wrap gap-1 pt-2">
                            {overflowTags.map((tag) => (
                                <TagItem key={tag} tag={tag} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
