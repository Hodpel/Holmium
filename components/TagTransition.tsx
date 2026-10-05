'use client'

import type { ReactNode } from 'react'
import { useParams } from 'next/navigation'

import ContentTransition from '@/components/ContentTransition'

const layoutClassName = 'grow self-stretch flex flex-col items-center lg:flex-row lg:items-stretch'

export default function TagTransition({ children }: { children: ReactNode }) {
    const { tag, page } = useParams<{ tag: string; page?: string }>()

    if (!tag) return <div className={layoutClassName}>{children}</div>

    const transitionKey = `${tag}/${page ?? '1'}`

    return (
        <ContentTransition transitionKey={transitionKey} className={layoutClassName}>
            {children}
        </ContentTransition>
    )
}
