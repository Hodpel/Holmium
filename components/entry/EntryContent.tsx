import type { ExtendedRecordMap } from 'notion-types'
import Image from 'next/image'
import { getBlockValue, getPageTableOfContents, parsePageId, uuidToId } from 'notion-utils'
import type { ReactNode } from 'react'

// 配置文件
import config from '@/blog.config'

// 工具函数
import type { BlogEntrySummary } from '@/lib/blog/types'
import type { NotionPageHrefMap } from '@/lib/notion/pageLinks'
import { buildEquationHtmlMap } from '@/lib/notion/equation'
import locale from '@/lib/locale'

// 页面组件
import PageIcon from '@/components/entry/PageIcon'
import ArticleTags from '@/components/entry/ArticleTags'
import FormattedDate from '@/components/entry/FormattedDate'
import FloatingTableOfContents, { type FloatingTableOfContentsEntry } from '@/components/entry/FloatingTableOfContents'
import NotionRenderer from '@/components/notion'
import ProgressiveArticle from '@/components/entry/ProgressiveArticle'

function buildFloatingTableOfContents(recordMap: ExtendedRecordMap, pageId: string): FloatingTableOfContentsEntry[] {
    const normalizedPageId = parsePageId(pageId, { uuid: true }) || pageId
    const page = getBlockValue(recordMap.block[normalizedPageId])
    if (page?.type !== 'page') return []

    return getPageTableOfContents(page, recordMap)
        .filter((entry) => entry.text.trim())
        .map((entry) => ({
            id: uuidToId(entry.id),
            indentLevel: entry.indentLevel,
            text: entry.text,
        }))
}

interface EntryContentProps {
    post: BlogEntrySummary
    emailHash: string
    children?: ReactNode
    showMetadata?: boolean
}

export default function EntryContent({ post, emailHash, children, showMetadata = true }: EntryContentProps) {
    const authorIdentity = (
        <>
            <Image alt={config.author.name} width={24} height={24} src={`https://cravatar.cn/avatar/${emailHash}`} className="rounded-full" />
            <p className="ml-2 md:block">{config.author.name}</p>
        </>
    )
    const authorMetadata = (
        <div className="flex shrink-0 items-center">
            {config.author.url ? (
                <a
                    href={config.author.url}
                    className="holmium-metadata-control -mx-1 -my-0.5 flex items-center rounded-md px-1 py-0.5"
                >
                    {authorIdentity}
                </a>
            ) : (
                <div className="flex items-center">{authorIdentity}</div>
            )}
            <span aria-hidden="true" className="mx-2 h-4 w-px shrink-0 bg-current opacity-30" />
            <FormattedDate date={post.publishedAt} />
        </div>
    )

    return (
        <article className="flex flex-col">
            <h1 className="flex w-full min-w-0 items-center gap-4 text-3xl font-bold text-black dark:text-white">
                {post.icon && (
                    <div className="relative h-9 w-9 shrink-0">
                        <PageIcon post={post} />
                    </div>
                )}
                <span className="min-w-0 [overflow-wrap:anywhere]">{post.title}</span>
            </h1>
            {showMetadata && post.kind === 'post' && (
                <nav className="mt-7 mb-4 w-full text-gray-500 dark:text-gray-400">
                    {post.tags.length > 0 ? (
                        <ArticleTags tags={post.tags} expandLabel={locale.POST.TAGS_EXPAND} collapseLabel={locale.POST.TAGS_COLLAPSE}>
                            {authorMetadata}
                        </ArticleTags>
                    ) : (
                        authorMetadata
                    )}
                </nav>
            )}
            {children}
        </article>
    )
}

export function EntryBody({
    post,
    recordMap,
    pageHrefMap,
    tableOfContents,
    children,
}: {
    post: BlogEntrySummary
    recordMap: ExtendedRecordMap
    pageHrefMap: NotionPageHrefMap
    tableOfContents?: readonly FloatingTableOfContentsEntry[]
    children?: ReactNode
}) {
    // Preserve Notion's page_full_width setting while treating missing metadata as the normal narrow layout.
    const fullWidth = post.fullWidth
    const resolvedTableOfContents = tableOfContents ?? buildFloatingTableOfContents(recordMap, post.id)
    const equationHtml = buildEquationHtmlMap(recordMap)

    return (
        <ProgressiveArticle key={post.id} recordMap={recordMap} footer={children}>
            <div className="items-stretch -mt-4 flex flex-col">
                {!fullWidth && <div className="flex-1 hidden lg:block" />}
                <div className={fullWidth ? 'flex-1' : 'flex-none w-full'}>
                    <NotionRenderer recordMap={recordMap} fullPage={false} pageHrefMap={pageHrefMap} equationHtml={equationHtml} />
                </div>
                {resolvedTableOfContents.length >= 3 && <FloatingTableOfContents entries={resolvedTableOfContents} />}
            </div>
        </ProgressiveArticle>
    )
}
