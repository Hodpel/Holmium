import type { Metadata } from 'next'

import type { AdvancedBlogConfig } from '@/config/blog.advanced'

type RobotsDetails = AdvancedBlogConfig['seo']['robots']

export function buildRobotsMetadata(index: boolean, details: RobotsDetails): NonNullable<Metadata['robots']> {
    const { follow, noarchive, noimageindex, googleBot } = details

    return {
        index,
        follow,
        noarchive,
        noimageindex,
        googleBot: {
            index,
            follow,
            'max-snippet': googleBot.maxSnippet,
            'max-image-preview': googleBot.maxImagePreview,
            'max-video-preview': googleBot.maxVideoPreview,
        },
    }
}
