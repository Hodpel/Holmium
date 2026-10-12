'use client'

import { useEffect, useRef } from 'react'
import { Audio, AudioPlayer, AudioSkin } from '@videojs/react/audio'
import { Video, VideoPlayer, VideoSkin } from '@videojs/react/video'
import { createI18n, useMedia } from '@videojs/react'
import { bindFilePlayback } from '@/lib/notion/mediaFrame'
import type { FileMediaPlayerProps } from './FileMediaEmbed'
import config from '@/blog.config'

const { I18nProvider } = createI18n({ loader: async () => undefined })

function Lifecycle(props: FileMediaPlayerProps) {
    const { active, playRequest, onFramePresented, onFailure, frozenFrame, onFrozenChange } = props
    const target = useMedia()
    const binding = useRef<ReturnType<typeof bindFilePlayback> | null>(null)
    useEffect(() => {
        if (!(target instanceof HTMLMediaElement)) return
        if (!active) { target.pause(); return }
        const current = bindFilePlayback(target, { kind: props.media.kind, onFramePresented, onFailure, frozenFrame: frozenFrame.current, onFrozenChange })
        binding.current = current
        return () => {
            current.dispose(); if (binding.current === current) binding.current = null
        }
    }, [target, active, props.media.kind, onFramePresented, onFailure, frozenFrame, onFrozenChange])

    useEffect(() => {
        if (active && playRequest !== null) void binding.current?.play()
    }, [target, active, playRequest])
    return null
}

export function FileMediaPlayer(props: FileMediaPlayerProps) {
    const animation = useRef<Animation | null>(null)
    useEffect(() => () => animation.current?.cancel(), [])
    const resize = (event: React.SyntheticEvent<HTMLVideoElement>) => {
        if (props.media.intrinsicRatioKnown) return
        const video = event.currentTarget
        const frame = video.closest<HTMLElement>('.holmium-file-frame')
        if (!frame || !video.videoWidth || !video.videoHeight) return
        animation.current?.cancel()
        const before = frame.getBoundingClientRect().height
        frame.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`
        const after = frame.getBoundingClientRect().height
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && Math.abs(before - after) >= 0.5) animation.current = frame.animate([{ height: `${before}px` }, { height: `${after}px` }], { duration: 300, easing: 'ease-out' })
    }
    return props.media.kind === 'audio' ? <AudioPlayer><AudioSkin><Audio src={props.media.src} preload="metadata" /><Lifecycle {...props} /></AudioSkin></AudioPlayer>
        : <VideoPlayer><VideoSkin renderPoster={() => null}><Video src={props.media.src} preload="metadata" playsInline onLoadedMetadata={resize} /><Lifecycle {...props} />{props.recovery}</VideoSkin></VideoPlayer>
}

export async function prepareFileMediaPlayer() {
    const pack = config.locale === 'zh-CN' ? await import('@videojs/react/i18n/locales/zh-CN')
        : config.locale === 'zh-HK' || config.locale === 'zh-TW' ? await import('@videojs/react/i18n/locales/zh-TW')
            : config.locale === 'es-ES' ? await import('@videojs/react/i18n/locales/es')
                : config.locale === 'ja-JP' ? await import('@videojs/react/i18n/locales/ja') : null
    return function LocalizedFilePlayer(props: FileMediaPlayerProps) {
        return <I18nProvider locale={config.locale} translations={pack?.default}><FileMediaPlayer {...props} /></I18nProvider>
    }
}
