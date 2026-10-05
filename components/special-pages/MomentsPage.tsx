import type { ExtendedRecordMap } from 'notion-types'
import { Suspense } from 'react'

import config from '@/blog.config'
import Container from '@/components/Container'
import EntryContent from '@/components/entry/EntryContent'
import FloatingTableOfContents from '@/components/entry/FloatingTableOfContents'
import { PostNav } from '@/components/entry/EntryNavigation'
import { NotionDocumentProvider, NotionFragment } from '@/components/notion'
import MomentsTimeline from '@/components/special-pages/MomentsTimeline'
import type { BlogEntrySummary } from '@/lib/blog/types'
import locale from '@/lib/locale'
import type { ArticleCover } from '@/lib/notion/articleCover'
import { buildEquationHtmlMap } from '@/lib/notion/equation'
import type { NotionPageHrefMap } from '@/lib/notion/pageLinks'
import { parseMomentsDocument } from '@/lib/special-pages/moments'

export default function MomentsPage({ post, recordMap, pageHrefMap, emailHash, cover }: {
    post: BlogEntrySummary
    recordMap: ExtendedRecordMap
    pageHrefMap: NotionPageHrefMap
    emailHash: string
    cover: ArticleCover | null
}) {
    const document = parseMomentsDocument(recordMap, post.id, config.locale, config.timezone)
    const tableOfContents = document.years.map((year) => ({ id: year.id, indentLevel: 0, text: year.id }))
    const currentYear = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: config.timezone }).format(new Date())
    const equationHtml = buildEquationHtmlMap(recordMap)

    return (
        <Container fullWidth={post.fullWidth} postTitle={post.title} cover={cover}>
            <EntryContent post={post} emailHash={emailHash} showMetadata={false}>
                <Suspense fallback={null}>
                    <div className="items-stretch -mt-4 flex flex-col">
                        <div className={post.fullWidth ? 'flex-1' : 'flex-none w-full'}>
                            <NotionDocumentProvider recordMap={recordMap} pageHrefMap={pageHrefMap} equationHtml={equationHtml}>
                                {document.introBlockIds.length > 0 && (
                                    <NotionFragment blockIds={document.introBlockIds} fragmentId="moments-intro" />
                                )}
                                <MomentsTimeline
                                    years={document.years}
                                    currentYear={currentYear}
                                    locale={config.locale}
                                    timeZone={config.timezone}
                                    label={post.title}
                                    emptyLabel={locale.MOMENTS.EMPTY}
                                />
                            </NotionDocumentProvider>
                        </div>
                        {document.years.length >= 3 && <FloatingTableOfContents entries={tableOfContents} />}
                    </div>
                    <PostNav kind="page" homeHref={config.path || '/'} />
                </Suspense>
            </EntryContent>
        </Container>
    )
}
