import type { BlogEntrySummary } from '../blog/types'

export interface ArchiveSpecialPageConfig {
    type: 'archive'
    pageId: string
}

export interface MomentsSpecialPageConfig {
    type: 'moments'
    pageId: string
}

export type SpecialPageConfig = ArchiveSpecialPageConfig | MomentsSpecialPageConfig

export interface ResolvedSpecialPage {
    type: SpecialPageConfig['type']
    page: BlogEntrySummary
}
