import type { Metadata } from 'next'

import TagPage, { generateTagMetadata } from '@/app/tag/TagPage'

// Generate tag pages on demand, then retain them in the full-route ISR cache.
export function generateStaticParams() {
    return []
}

export function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
    return generateTagMetadata(params)
}

export default function Tag({ params }: { params: Promise<{ tag: string }> }) {
    return <TagPage params={params} />
}
