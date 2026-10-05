'use client'

import { AnimatePresence } from 'motion/react'
import { usePathname } from 'next/navigation'
import { LayoutRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'

import { useContext } from 'react'
import { PageEntrance, type PageEntranceProps } from '@/components/navigation/PageEntrance'

type LayoutTransitionProps = PageEntranceProps

export function LayoutTransition({ children, className, style, initial, animate, exit }: LayoutTransitionProps) {
    const pathname = usePathname()
    const routerContext = useContext(LayoutRouterContext)

    return (
        <AnimatePresence mode="popLayout">
            <PageEntrance className={className} style={style} key={pathname} initial={initial} animate={animate} exit={exit}>
                <LayoutRouterContext.Provider value={routerContext}>{children}</LayoutRouterContext.Provider>
            </PageEntrance>
        </AnimatePresence>
    )
}
