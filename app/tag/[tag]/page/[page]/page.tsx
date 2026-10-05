import type { Metadata } from 'next'

import TagPage, { generateTagMetadata } from '@/app/tag/TagPage'

export function generateStaticParams() {
    return []
}

export function generateMetadata({ params }: { params: Promise<{ tag: string; page: string }> }): Promise<Metadata> {
    return generateTagMetadata(params, true)
}

export default function PaginatedTag({ params }: { params: Promise<{ tag: string; page: string }> }) {
    return <TagPage params={params} paginated />
}
