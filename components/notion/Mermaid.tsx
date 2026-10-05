import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import mermaid from 'mermaid'
import type { CodeBlock } from 'notion-types'
import { getTextContent } from 'notion-utils'
import { useNotionContext } from 'react-notion-x'
import { useResolvedTheme } from '@/components/ThemeRuntime'
import { getMermaidImageSource, isMermaidLinkTarget, openMermaidLinksInNewTab } from '@/lib/notion/mermaidPreview'
import {
    createMermaidRenderer,
    getVisibleMermaidSvg,
    type MermaidRenderState,
} from '@/lib/notion/mermaidRender'

const renderMermaid = createMermaidRenderer({
    initialize: (options) => mermaid.initialize(options),
    render: (id, source) => mermaid.render(id, source),
})

type MermaidZoom = {
    attach(target: HTMLImageElement): void
    detach(target: HTMLImageElement): void
    open(options: { target: HTMLImageElement }): Promise<unknown>
}

type MermaidZoomRequest = {
    key: string
    source: string
    style: CSSProperties
}

export default function Mermaid({ block }: { block: CodeBlock }) {
    const theme = useResolvedTheme()
    const reduceMotion = useReducedMotion()
    const { zoom } = useNotionContext()
    const source = getTextContent(block.properties.title)
    const renderKey = `${theme}:${source}`
    const [renderState, setRenderState] = useState<MermaidRenderState>(null)
    const [zoomRequest, setZoomRequest] = useState<MermaidZoomRequest | null>(null)
    const [revealedSource, setRevealedSource] = useState<string | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const zoomImageRef = useRef<HTMLImageElement>(null)
    const [zoomInstance] = useState<MermaidZoom | null>(() => (zoom ? zoom.clone() : null))

    useEffect(() => {
        let active = true
        const controller = new AbortController()

        void renderMermaid(source, theme === 'dark' ? 'dark' : 'neutral', controller.signal).then(
            (svg) => {
                if (!active) return
                setRenderState({ key: renderKey, source, status: 'ready', svg: openMermaidLinksInNewTab(svg) })
            },
            () => {
                if (active) setRenderState({ key: renderKey, source, status: 'failed' })
            },
        )

        return () => {
            active = false
            controller.abort()
        }
    }, [renderKey, source, theme])

    useEffect(() => {
        const image = zoomImageRef.current
        if (!zoomRequest || zoomRequest.key !== renderKey || !image || !zoomInstance) return

        let active = true
        const openZoom = () => {
            if (active && image.isConnected) void zoomInstance.open({ target: image })
        }

        zoomInstance.attach(image)
        void image.decode().then(openZoom, () => {
            if (image.complete && image.naturalWidth > 0) openZoom()
        })

        return () => {
            active = false
            zoomInstance.detach(image)
        }
    }, [renderKey, zoomRequest, zoomInstance])

    if (renderState?.key === renderKey && renderState.status === 'failed') {
        return (
            <pre className="notion-code text language-plain" tabIndex={0}>
                <code className="language-plain">{source}</code>
            </pre>
        )
    }

    const svg = getVisibleMermaidSvg(renderState, source)
    const visibleKey = renderState?.status === 'ready' && svg ? renderState.key : null
    const revealComplete = Boolean(reduceMotion) || (visibleKey !== null && revealedSource === source)

    const handleDiagramClick = (event: MouseEvent<HTMLDivElement>) => {
        if (!svg || isMermaidLinkTarget(event.target) || window.getSelection()?.isCollapsed === false) return

        const container = containerRef.current
        const svgElement = container?.querySelector<SVGSVGElement>('.holmium-mermaid-svg > svg')
        if (!container || !svgElement || !zoomInstance) return

        const containerBounds = container.getBoundingClientRect()
        const svgBounds = svgElement.getBoundingClientRect()
        const serializedSvg = new XMLSerializer().serializeToString(svgElement)
        setZoomRequest({
            key: renderKey,
            source: getMermaidImageSource(serializedSvg),
            style: {
                left: svgBounds.left - containerBounds.left,
                top: svgBounds.top - containerBounds.top,
                width: svgBounds.width,
                height: svgBounds.height,
            },
        })
    }

    return (
        <motion.div
            ref={containerRef}
            className="holmium-mermaid"
            data-ready={Boolean(svg)}
            data-reveal-complete={revealComplete}
            initial={false}
            animate={{ height: svg ? 'auto' : '12rem' }}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
            onAnimationComplete={() => {
                if (visibleKey) setRevealedSource(source)
            }}
            onClick={handleDiagramClick}
        >
            {zoomRequest?.key === renderKey ? (
                // medium-zoom only attaches to native image elements.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    ref={zoomImageRef}
                    className="holmium-mermaid-zoom-source"
                    src={zoomRequest.source}
                    style={zoomRequest.style}
                    alt=""
                    aria-hidden="true"
                />
            ) : null}
            {svg ? (
                <motion.div
                    key={visibleKey}
                    className="holmium-mermaid-svg"
                    initial={revealComplete ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
                    dangerouslySetInnerHTML={{ __html: svg }}
                />
            ) : null}
            {!svg || !revealComplete ? (
                <motion.div
                    className={`holmium-mermaid-placeholder${svg ? ' holmium-mermaid-placeholder-overlay' : ''}`}
                    aria-hidden="true"
                    initial={false}
                    animate={{ opacity: svg ? 0 : 1 }}
                    transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
                />
            ) : null}
        </motion.div>
    )
}
