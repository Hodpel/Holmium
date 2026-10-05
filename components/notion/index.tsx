'use client'
// 外部依赖
import React from 'react'
import { useRouter } from 'next/navigation'
import { getBlockValue, getTextContent } from 'notion-utils'
import {
    ExtendedRecordMap,
    CodeBlock,
} from 'notion-types'
import { NotionRenderer as Renderer } from 'react-notion-x'
import { ensurePrismLanguage } from '@/components/notion/prismLanguages'
import Pdf from '@/components/notion/Pdf'
import { useResolvedTheme } from '@/components/ThemeRuntime'
import SmoothLink from '@/components/SmoothLink'
import {
    resolveKnownNotionUrl,
    resolveNotionPageLinkHref,
    resolveNotionPageHref,
    resolveSiteHref,
    type NotionPageHrefMap,
} from '@/lib/notion/pageLinks'
import { mapNotionImageUrl } from '@/lib/notion/imageUrl'
import { recoverCachedImageLoads } from '@/lib/notion/imageLoadRecovery'
import type { EquationHtmlMap } from '@/lib/notion/equation'
import Equation, { EquationHtmlProvider } from '@/components/notion/Equation'
import LazyCollection, { type CollectionProps } from '@/components/notion/LazyCollection'
import { CollectionCheckboxValue } from '@/components/notion/collectionPropertyValues'
import VideoPreviews from '@/components/notion/VideoPreviews'
import { DATE_MENTION_PREFIX, localizeRecordMapDates } from '@/lib/notion/localizeDates'
import { normalizeUserMentions, PERSON_MENTION_PREFIX } from '@/lib/notion/userMentions'
import PersonMention from '@/components/notion/PersonMention'
import { useDateClock } from '@/components/notion/useDateClock'
import { normalizeRenderBlocks, UNAVAILABLE_LINK_MARKER } from '@/lib/notion/normalizeRenderBlocks'
import { StaticLinkMention } from '@/components/LinkMentionIcon'
import LinkMention from './LinkMention'
import { WEB_MENTION_PREFIX } from '@/lib/notion/webMention'
import Button from '@/components/notion/Button'
import TabTransitions from '@/components/notion/TabTransitions'
import { clearPostOrigin } from '@/lib/navigation/post-origin'
import { scrollToPageTop } from '@/lib/navigation/scroll'
import { useArticleProgress } from '@/components/entry/ProgressiveArticle'
import { planRenderBatches, projectRenderBatch } from '@/lib/notion/renderBatches'
import { projectPageContent } from '@/lib/notion/contentProjection'
import DeferredMermaid from '@/components/notion/DeferredMermaid'

// 配置文件
import config from '@/blog.config'
import locale from '@/lib/locale'

type LoadedPrismCode = {
    language: string
    Component: React.ComponentType<{ block: CodeBlock }>
}

function PrismCode(props: { block: CodeBlock }) {
    const lang = getTextContent(props.block.properties.language)
    const [loadedCode, setLoadedCode] = React.useState<LoadedPrismCode | null>(null)
    const CodeComponent = loadedCode?.language === lang ? loadedCode.Component : null

    React.useEffect(() => {
        let active = true

        void import('react-notion-x/build/third-party/code').then(async (module) => {
            await ensurePrismLanguage(lang)
            if (active) setLoadedCode({ language: lang, Component: module.Code })
        })

        return () => {
            active = false
        }
    }, [lang])

    if (!CodeComponent) {
        return (
            <pre className="notion-code text language-plain" tabIndex={0}>
                <code className="language-plain">{getTextContent(props.block.properties.title)}</code>
            </pre>
        )
    }

    return <CodeComponent {...props} />
}

const Code = function CodeSwitch(props: { block: CodeBlock }) {
    const language = getTextContent(props.block.properties.language)
    return language.toLocaleLowerCase('en-US') === 'mermaid' ? <DeferredMermaid {...props} /> : <PrismCode {...props} />
}

function Collection(props: CollectionProps) {
    // Every blog entry is a page inside the root Notion collection. react-notion-x
    // renders that page's database properties through the heavy Collection component,
    // but Holmium already owns this metadata header and intentionally hides the
    // duplicate collection row. Keep real collection_view blocks lazy while avoiding
    // the unused Collection bundle and hidden DOM on ordinary posts and pages.
    if (props.block.type === 'page') return null

    const viewId = props.block.view_ids?.[0]
    const view = viewId ? getBlockValue(props.ctx.recordMap.collection_view[viewId]) : undefined
    if (!viewId || !view) {
        return (
            <div className="notion-collection notion-collection-fallback" role="status">
                {locale.NOTION.COLLECTION_UNAVAILABLE}
            </div>
        )
    }

    if (!['table', 'gallery', 'list', 'board'].includes(view.type)) {
        const viewName = `${view.type.charAt(0).toUpperCase()}${view.type.slice(1)}`
        return (
            <div className="notion-collection notion-collection-fallback" role="status">
                {locale.NOTION.COLLECTION_UNSUPPORTED.replace('{view}', viewName)}
            </div>
        )
    }

    return <LazyCollection {...props} />
}

const NotionPageHrefContext = React.createContext<NotionPageHrefMap>({})

type NotionLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement>

function isLocalHref(href: string): boolean {
    return href.startsWith('/') && !href.startsWith('//')
}

function useResolvedNotionHref(href: string | undefined): string {
    const pageHrefMap = React.useContext(NotionPageHrefContext)
    if (!href) return ''

    return resolveKnownNotionUrl(href, pageHrefMap) || resolveSiteHref(href, config.siteUrl) || href
}

function useResolvedNotionPageHref(href: string | undefined): string | null {
    const pageHrefMap = React.useContext(NotionPageHrefContext)
    if (!href) return null

    const resolvedHref = resolveNotionPageLinkHref(href, pageHrefMap)
    return resolvedHref ? resolveSiteHref(resolvedHref, config.siteUrl) || resolvedHref : null
}

function isSubpageHref(href: string) {
    return href.startsWith('/-/subpage/') || /^\/[^/]+\/[^/]+-[a-f0-9]{4}(?:[a-f0-9]{2}){0,14}(?:[?#]|$)/i.test(href)
}

function NotionLink({ href, target, rel, ...props }: NotionLinkProps) {
    const resolvedHref = useResolvedNotionHref(href)
    if (href?.startsWith(WEB_MENTION_PREFIX)) return <LinkMention encoded={href.slice(WEB_MENTION_PREFIX.length)} />
    if (href === UNAVAILABLE_LINK_MARKER) {
        return <span className="text-gray-500 dark:text-gray-400"><StaticLinkMention text="链接失效" icon={{ type: 'link' }} /></span>
    }
    if (href?.startsWith(PERSON_MENTION_PREFIX)) {
        let id = ''
        try { id = decodeURIComponent(href.slice(PERSON_MENTION_PREFIX.length)) } catch { /* Missing users still retain their fallback name. */ }
        return <PersonMention id={id}>{props.children}</PersonMention>
    }
    if (href?.startsWith(DATE_MENTION_PREFIX)) {
        let title = ''
        try { title = decodeURIComponent(href.slice(DATE_MENTION_PREFIX.length)) } catch { /* Ignore malformed markers. */ }
        return <span className="holmium-date-mention" title={title || undefined}>{props.children}</span>
    }
    if (isLocalHref(resolvedHref) && !resolvedHref.startsWith('/-/notion-file/')) {
        return <SmoothLink {...props} href={resolvedHref} prefetch={isSubpageHref(resolvedHref) ? false : undefined} />
    }

    return <a {...props} href={resolvedHref} target={target || '_blank'} rel={rel || 'noopener noreferrer'} />
}

function NotionPageLink({ href, target, rel, ...props }: NotionLinkProps) {
    const resolvedHref = useResolvedNotionPageHref(href)
    if (!resolvedHref) {
        const staticProps = props as unknown as React.HTMLAttributes<HTMLSpanElement>
        return <span {...staticProps} data-holmium-page-static="" />
    }

    if (isLocalHref(resolvedHref)) return <SmoothLink {...props} href={resolvedHref} prefetch={isSubpageHref(resolvedHref) ? false : undefined} />

    return <a {...props} href={resolvedHref} target={target} rel={rel} />
}

function SameSiteLinkMentionNavigation({ children }: { children: React.ReactNode }) {
    const router = useRouter()

    const handleClickCapture = React.useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                !(event.target instanceof Element)
            ) {
                return
            }

            const link = event.target.closest<HTMLAnchorElement>('.notion-link-mention-link')
            const resolvedHref = link ? resolveSiteHref(link.href, config.siteUrl) : null
            if (!resolvedHref) return

            event.preventDefault()
            clearPostOrigin()
            scrollToPageTop()
            router.push(resolvedHref, { scroll: false })
        },
        [router],
    )

    return <div onClickCapture={handleClickCapture}>{children}</div>
}

const components = {
    Button,
    Code,
    Collection,
    Equation,
    Link: NotionLink,
    PageLink: NotionPageLink,
    Pdf,
    propertyCheckboxValue: CollectionCheckboxValue,
}

type PreparedDocument = {
    recordMap: ExtendedRecordMap
    rootId: string
    mapPageUrl: (id: string) => string
    darkMode: boolean
}

const PreparedDocumentContext = React.createContext<PreparedDocument | null>(null)

function CachedImageLoadRecovery({ recordMap }: { recordMap: ExtendedRecordMap }) {
    React.useEffect(() => {
        const images = document.querySelectorAll<HTMLImageElement>(
            '.lazy-image-wrapper:not(.lazy-image-loaded) > .lazy-image-real',
        )

        recoverCachedImageLoads(images, (image) => {
            image.dispatchEvent(new Event('load'))
        })
    }, [recordMap])

    return null
}

/**
 * Notion page renderer
 *
 * A wrapper of react-notion-x/NotionRenderer with predefined `components` and `mapPageUrl`
 *
 * Accepts only the RecordMap, page mode, route map and pre-rendered equations used here.
 */
export function NotionDocumentProvider(props: {
    recordMap: ExtendedRecordMap
    pageHrefMap: NotionPageHrefMap
    equationHtml: EquationHtmlMap
    children: React.ReactNode
}) {
    const theme = useResolvedTheme()
    const dateSnapshot = useDateClock(props.recordMap, config.timezone)
    const personRecordMap = React.useMemo(() => normalizeUserMentions(props.recordMap, config.locale), [props.recordMap])
    const localizedRecordMap = React.useMemo(
        () => normalizeRenderBlocks(localizeRecordMapDates(personRecordMap, config.locale, {
            now: dateSnapshot ? new Date(dateSnapshot) : undefined,
            timeZone: config.timezone,
        })),
        [personRecordMap, dateSnapshot],
    )
    const mapPageUrl = React.useCallback(
        (id: string) => resolveNotionPageHref(id, props.pageHrefMap),
        [props.pageHrefMap],
    )
    const rootId = React.useMemo(() => planRenderBatches(localizedRecordMap).rootId, [localizedRecordMap])
    const prepared = React.useMemo(() => ({
        recordMap: localizedRecordMap,
        rootId,
        mapPageUrl,
        darkMode: theme === 'dark',
    }), [localizedRecordMap, rootId, mapPageUrl, theme])
    const font = {
        'sans-serif': '--font-sans',
        serif: '--font-serif',
    }[config.font]

    return (
        <>
            <style jsx global>
                {`
                    .notion {
                        --notion-font: var(${font});
                    }
                `}
            </style>
            <NotionPageHrefContext.Provider value={props.pageHrefMap}>
                <CachedImageLoadRecovery recordMap={localizedRecordMap} />
                <VideoPreviews recordMap={localizedRecordMap} />
                <EquationHtmlProvider value={props.equationHtml}>
                    <SameSiteLinkMentionNavigation>
                        <TabTransitions>
                            <PreparedDocumentContext.Provider value={prepared}>
                                {props.children}
                            </PreparedDocumentContext.Provider>
                        </TabTransitions>
                    </SameSiteLinkMentionNavigation>
                </EquationHtmlProvider>
            </NotionPageHrefContext.Provider>
        </>
    )
}

export function NotionFragment({
    blockIds,
    fragmentId,
    fullPage = false,
    progressive = false,
}: {
    blockIds?: readonly string[]
    fragmentId: string
    fullPage?: boolean
    progressive?: boolean
}) {
    const document = React.useContext(PreparedDocumentContext)
    const progress = useArticleProgress()
    if (!document) throw new Error('NotionFragment must be rendered inside NotionDocumentProvider')

    const fragmentView = React.useMemo(
        () => blockIds ? projectPageContent(document.recordMap, document.rootId, blockIds, fragmentId) : null,
        [blockIds, document.recordMap, document.rootId, fragmentId],
    )
    const renderView: { blockId?: string; recordMap: ExtendedRecordMap } = fragmentView
        ?? (progressive && progress ? projectRenderBatch(document.recordMap, progress.plan, progress.end) : { recordMap: document.recordMap })

    return (
        <Renderer
            components={components}
            darkMode={document.darkMode}
            mapPageUrl={document.mapPageUrl}
            mapImageUrl={mapNotionImageUrl}
            previewImages={Boolean(document.recordMap.preview_images)}
            {...renderView}
            fullPage={fullPage}
        />
    )
}

export default function NotionRenderer(props: {
    recordMap: ExtendedRecordMap
    fullPage: boolean
    pageHrefMap: NotionPageHrefMap
    equationHtml: EquationHtmlMap
}) {
    return (
        <NotionDocumentProvider recordMap={props.recordMap} pageHrefMap={props.pageHrefMap} equationHtml={props.equationHtml}>
            <NotionFragment fragmentId="page" fullPage={props.fullPage} progressive />
        </NotionDocumentProvider>
    )
}
