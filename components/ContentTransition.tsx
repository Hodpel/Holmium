'use client'

import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'

export default function ContentTransition({
    transitionKey,
    className,
    children,
}: {
    transitionKey: string
    className?: string
    children: ReactNode
}) {
    return (
        <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
                key={transitionKey}
                className={className}
                data-content-transition={transitionKey}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }}
                exit={{ opacity: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    )
}
