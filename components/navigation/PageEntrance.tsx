'use client'

import { createContext, forwardRef, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { motion, useIsPresent, useReducedMotion, type TargetAndTransition } from 'motion/react'
import { waitForEntryAnimations } from '@/lib/navigation/entryAnimations'

const EntranceContext = createContext({ ready: true, revealNow: () => {} })
export const usePageEntrance = () => useContext(EntranceContext)
export type PageEntranceProps = Pick<ComponentProps<typeof motion.main>, 'className' | 'style' | 'initial' | 'animate' | 'exit'> & { children: ReactNode }

// This component is keyed per route by LayoutTransition. Its completion cannot
// release a later route, and forwardRef preserves AnimatePresence popLayout.
export const PageEntrance = forwardRef<HTMLElement, PageEntranceProps>(function PageEntrance({ children, initial, animate, exit, ...props }, ref) {
    const [entered, setEntered] = useState(false)
    const reduceMotion = useReducedMotion()
    const present = useIsPresent()
    const waiting = useRef<AbortController | null>(null)
    const revealNow = useCallback(() => setEntered(true), [])
    const ready = entered || Boolean(reduceMotion) || initial === false || !animate
    const context = useMemo(() => ({ ready, revealNow }), [ready, revealNow])

    useEffect(() => {
        if (!present) waiting.current?.abort()
        return () => waiting.current?.abort()
    }, [present])

    return (
        <motion.main
            {...props}
            ref={ref}
            initial={initial}
            variants={{ entered: (animate ?? {}) as TargetAndTransition, exited: (exit ?? {}) as TargetAndTransition }}
            animate="entered"
            exit="exited"
            onAnimationComplete={definition => {
                if (definition !== 'entered' || !present) return
                waiting.current?.abort()
                const controller = new AbortController()
                waiting.current = controller
                void waitForEntryAnimations(document.getElementById('sticky-nav'), controller.signal).then(() => {
                    if (!controller.signal.aborted) setEntered(true)
                })
            }}
        >
            <EntranceContext.Provider value={context}>{children}</EntranceContext.Provider>
        </motion.main>
    )
})
