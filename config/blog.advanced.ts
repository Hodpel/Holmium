import 'server-only'

import type { SpecialPageConfig } from '@/lib/special-pages/types'

export type AdvancedBlogConfig = {
    specialPages: readonly SpecialPageConfig[]
    seo: {
        /** Whether internal search result pages may be indexed when site-wide indexing is enabled. */
        indexSearchResults: boolean
        robots: {
            follow: boolean
            noarchive: boolean
            noimageindex: boolean
            googleBot: {
                maxSnippet: number
                maxImagePreview: 'none' | 'standard' | 'large'
                maxVideoPreview: number
            }
        }
    }
}

/**
 * Advanced settings that most blog owners do not need to change.
 * Common options remain in `blog.config.ts` at the project root.
 */
const advancedConfig = {
    specialPages: [],
    seo: {
        indexSearchResults: false,
        robots: {
            follow: true,
            noarchive: false,
            noimageindex: false,
            googleBot: {
                maxSnippet: -1,
                maxImagePreview: 'large',
                maxVideoPreview: -1,
            },
        },
    },
} satisfies AdvancedBlogConfig

export default advancedConfig
