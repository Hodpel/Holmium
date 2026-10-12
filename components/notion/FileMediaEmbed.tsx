'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { useInView, useIsPresent } from 'motion/react'
import { LoaderCircle, RotateCcw } from 'lucide-react'
import Image from 'next/image'
import { Text, useNotionContext } from 'react-notion-x'
import type { Block } from 'notion-types'
import type { FileMediaDescriptor } from '@/lib/notion/fileMedia'
import { reduceMediaPresentation } from '@/lib/notion/mediaPresentation'
import locale from '@/lib/locale'

export type FileMediaPlayerProps = {
    media: FileMediaDescriptor; playRequest: number | null; active: boolean
    onFramePresented(): void; onFailure(reason: 'module' | 'source' | 'activation'): void
    frozenFrame: React.RefObject<HTMLCanvasElement | null>; onFrozenChange(frozen: boolean): void
    recovery?: ReactNode
}
type EmbedProps = { block: Block; blockId: string }
const Context = createContext<{ media: ReadonlyMap<string, FileMediaDescriptor>; DefaultEmbed: ComponentType<EmbedProps> } | null>(null)

export function FileMediaDocument({ media, children }: { media: ReadonlyMap<string, FileMediaDescriptor>; children: ReactNode }) {
    const DefaultEmbed = useNotionContext().components.Embed as ComponentType<EmbedProps>
    const value = useMemo(() => ({ media, DefaultEmbed }), [media, DefaultEmbed])
    return <Context.Provider value={value}>{children}</Context.Provider>
}

function FileMediaRetryButton({ pending, onRetry }: { pending: boolean; onRetry(): void }) {
    return <button type="button" className="holmium-file-retry" onClick={onRetry} disabled={pending} aria-label={locale.NOTION.MEDIA_RETRY} data-pending={pending || undefined}>
        <LoaderCircle className="holmium-file-wait-icon" aria-hidden="true" />
        <RotateCcw className="holmium-file-retry-icon" aria-hidden="true" />
    </button>
}

function FileMediaFrame({ media }: { media: FileMediaDescriptor }) {
    const container = useRef<HTMLDivElement>(null)
    const posterImage = useRef<HTMLImageElement>(null)
    const frozenFrame = useRef<HTMLCanvasElement>(null)
    const near = useInView(container, { once: true, margin: '600px 0px' })
    const present = useIsPresent()
    const alive = useRef(true)
    const [view, dispatch] = useReducer(reduceMediaPresentation, { surface: 'preview', error: false })
    const [failure, setFailure] = useState<'module' | 'source' | 'activation' | null>(null)
    const [Player, setPlayer] = useState<ComponentType<FileMediaPlayerProps> | null>(null)
    const [playRequest, setPlayRequest] = useState<number | null>(null)
    const [pendingPlay, setPendingPlay] = useState(false)
    const [frozen, setFrozen] = useState(false)
    const loading = useRef<Promise<void> | null>(null)
    useEffect(() => { alive.current = present; return () => { alive.current = false } }, [present])
    const failed = useCallback((reason: 'module' | 'source' | 'activation') => {
        if (!alive.current) return
        setFailure(reason); setPendingPlay(false); dispatch('error')
    }, [])
    const framePresented = useCallback(() => {
        if (!alive.current) return
        dispatch('frame-presented'); setPendingPlay(false)
    }, [])
    const decoded = useCallback((image: HTMLImageElement) => {
        void image.decode().then(() => { if (alive.current) dispatch('poster-decoded') }).catch(() => {})
    }, [])
    useEffect(() => {
        const image = posterImage.current
        if (image?.complete && image.naturalWidth > 0) decoded(image)
    }, [decoded])
    const prepare = useCallback(() => {
        if (Player || loading.current) return
        const css = media.kind === 'audio' ? import('@videojs/react/audio/skin.css') : import('@videojs/react/video/skin.css')
        loading.current = Promise.all([import('./FileMediaPlayer'), css]).then(([module]) => {
            return module.prepareFileMediaPlayer().then(component => { if (alive.current) setPlayer(() => component) })
        }).catch(() => failed('module')).finally(() => { loading.current = null })
    }, [Player, media.kind, failed])
    useEffect(() => { if (near && present) prepare() }, [near, present, prepare])
    const play = () => {
        if (pendingPlay || !present) return
        setFailure(null); dispatch('retry'); setPendingPlay(true)
        setPlayRequest(value => (value ?? 0) + 1); prepare()
    }
    const errorText = failure === 'activation' ? locale.NOTION.MEDIA_PLAY_AGAIN : locale.NOTION.MEDIA_FAILED
    const recovery = media.kind === 'video' ? <>
        <canvas ref={frozenFrame} width={0} height={0} className="holmium-file-frozen" data-frozen={frozen || undefined} aria-hidden="true" />
        {(failure || pendingPlay) && <FileMediaRetryButton pending={pendingPlay} onRetry={play} />}
        {view.surface === 'frame' && failure && <div className="holmium-file-error" role="status">{errorText}</div>}
    </> : null
    return <div ref={container} className={`holmium-file-frame holmium-file-${media.kind}`} data-surface={view.surface} data-player-ready={!!Player || undefined} aria-busy={pendingPlay || undefined} style={{ aspectRatio: media.kind === 'video' ? media.reservedRatio.join(' / ') : undefined }}>
        <div className="holmium-file-runtime">
            {Player && <Player media={media} playRequest={playRequest} active={present} onFramePresented={framePresented} onFailure={failed} frozenFrame={frozenFrame} onFrozenChange={setFrozen} recovery={recovery} />}
        </div>
        {media.kind === 'video' && <>
            <div className="holmium-file-cover" aria-hidden="true">
                {media.preview && <Image className="holmium-file-preview" src={media.preview} alt="" fill unoptimized />}
                {media.poster && <Image ref={posterImage} className="holmium-file-poster" src={media.poster} alt="" fill sizes="(max-width: 768px) 100vw, 768px" onLoad={event => decoded(event.currentTarget)} />}
            </div>
            {!Player && recovery}
        </>}
        {failure && (media.kind === 'audio' || view.surface !== 'frame') && <div className="holmium-file-error" role="status"><span>{errorText}</span>{media.kind === 'audio' && <button type="button" onClick={play}>{locale.NOTION.MEDIA_RETRY}</button>}</div>}
    </div>
}

export default function FileMediaEmbed(props: EmbedProps) {
    const context = useContext(Context)
    if (!context) return null
    const media = context.media.get(props.block.id)
    if (!media) return <context.DefaultEmbed {...props} />
    const format = props.block.format
    return <figure className={`notion-asset-wrapper notion-asset-wrapper-${media.kind}${format?.block_full_width ? ' notion-asset-wrapper-full' : ''} ${props.blockId}`} style={format?.block_full_width ? { width: '100vw' } : undefined}>
        <div className="holmium-file-asset" style={{ width: format?.block_full_width ? '100vw' : format?.block_page_width ? '100%' : format?.block_width || '100%', maxWidth: '100%', alignSelf: format?.block_alignment === 'left' ? 'start' : format?.block_alignment === 'right' ? 'end' : 'center' }}>
            <FileMediaFrame key={`${media.blockId}:${media.src}`} media={media} />
            {media.caption && <figcaption className="notion-asset-caption"><Text value={media.caption} block={props.block} /></figcaption>}
        </div>
    </figure>
}
