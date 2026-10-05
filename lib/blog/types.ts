export type BlogEntryKind = 'post' | 'page' | 'sub'

export type SummaryMentionIcon = { type: 'github' | 'link' | 'page' } | { type: 'emoji'; text: string } | { type: 'image'; src: string; fallback?: 'page' }
export type SummaryTextMark = 'b' | 'i' | '_' | 's' | 'c'
export type SummaryPart = { type: 'text'; text: string; marks?: SummaryTextMark[] } | { type: 'mention'; text: string; icon: SummaryMentionIcon } | { type: 'person'; text: string; avatar?: string } | { type: 'date'; text: string; value: import('../notion/dateFormat').NotionDate }

export type BlogIcon =
    | { kind: 'emoji'; value: string }
    | { kind: 'image'; src: string }
    | null

export interface BlogEntrySummary {
    id: string
    slug: string
    title: string
    kind: BlogEntryKind
    publishedAt: string
    summary: string | null
    summaryParts?: readonly SummaryPart[]
    tags: readonly string[]
    icon: BlogIcon
    fullWidth: boolean
}

export interface BlogIndex {
    rootPageId: string
    entries: readonly BlogEntrySummary[]
    contentRevisions: Readonly<Record<string, string>>
}
