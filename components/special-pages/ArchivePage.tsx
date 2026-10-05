import type { ExtendedRecordMap } from 'notion-types'
import { Suspense } from 'react'

import config from '@/blog.config'
import Container from '@/components/Container'
import EntryContent, { EntryBody } from '@/components/entry/EntryContent'
import { PostNav } from '@/components/entry/EntryNavigation'
import ArchiveTimeline from '@/components/special-pages/ArchiveTimeline'
import type { BlogEntrySummary } from '@/lib/blog/types'
import locale from '@/lib/locale'
import type { ArticleCover } from '@/lib/notion/articleCover'
import type { NotionPageHrefMap } from '@/lib/notion/pageLinks'
import { archiveTableOfContents, buildArchiveYears } from '@/lib/special-pages/archive'

export default function ArchivePage({
    post,
    recordMap,
    pageHrefMap,
    posts,
    emailHash,
    cover,
}: {
    post: BlogEntrySummary
    recordMap: ExtendedRecordMap
    pageHrefMap: NotionPageHrefMap
    posts: readonly BlogEntrySummary[]
    emailHash: string
    cover: ArticleCover | null
}) {
    const years = buildArchiveYears(posts, config.locale, config.timezone)
    const tableOfContents = archiveTableOfContents(years)

    return (
        <Container fullWidth={post.fullWidth} postTitle={post.title} cover={cover}>
            <EntryContent post={post} emailHash={emailHash}>
                <Suspense fallback={null}>
                    <EntryBody
                        post={post}
                        recordMap={recordMap}
                        pageHrefMap={pageHrefMap}
                        tableOfContents={tableOfContents}
                    >
                        <ArchiveTimeline years={years} label={post.title} emptyLabel={locale.ARCHIVE.EMPTY} />
                        <PostNav kind={post.kind} homeHref={config.path || '/'} />
                    </EntryBody>
                </Suspense>
            </EntryContent>
        </Container>
    )
}
