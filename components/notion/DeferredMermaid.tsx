'use client'

import dynamic from 'next/dynamic'
import { useRef } from 'react'
import { useInView } from 'motion/react'
import type { CodeBlock } from 'notion-types'
import { usePageEntrance } from '@/components/navigation/PageEntrance'

const Placeholder = () => <div className="holmium-mermaid-placeholder" aria-hidden="true" />
const Mermaid = dynamic(() => import('@/components/notion/Mermaid'), {
    ssr: false,
    loading: Placeholder,
})

export default function DeferredMermaid({ block }: { block: CodeBlock }) {
    const container = useRef<HTMLDivElement>(null)
    // Prepare diagrams a little before they enter the viewport, not every
    // offscreen SVG while article batches and entrance animations are running.
    const nearViewport = useInView(container, { once: true, margin: '600px 0px' })
    const { ready } = usePageEntrance()

    return (
        <div ref={container} className="w-full">
            {nearViewport && ready ? <Mermaid block={block} /> : <Placeholder />}
        </div>
    )
}
