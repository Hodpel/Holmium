'use client'

import { useEffect, useMemo } from 'react'
import type { ExtendedRecordMap } from 'notion-types'

import { mapNotionImageUrl } from '@/lib/notion/imageUrl'
import {
    buildVideoPreviewStyleSheet,
    calculateVideoDisplayHeight,
    collectVideoPreviewDescriptors,
    type VideoPreviewDescriptor,
} from '@/lib/notion/videoPreview'

const VIDEO_REVEAL_DURATION_MS = 300

function connectVideoPreview(descriptor: VideoPreviewDescriptor): () => void {
    const wrapper = document.querySelector<HTMLElement>(`.notion-block-${descriptor.blockId}`)
    const video = wrapper?.querySelector<HTMLVideoElement>(':scope > div > video')
    if (!wrapper || !video) return () => undefined

    const previousPoster = video.getAttribute('poster')
    wrapper.dataset.holmiumVideoPreview = 'true'
    wrapper.setAttribute('aria-busy', 'true')
    video.poster = descriptor.thumbnailUrl

    const reveal = () => {
        wrapper.dataset.holmiumVideoReady = 'true'
        wrapper.removeAttribute('aria-busy')
    }

    if (video.readyState >= 1 || video.error) reveal()
    else {
        video.addEventListener('loadedmetadata', reveal, { once: true })
        video.addEventListener('error', reveal, { once: true })
    }

    return () => {
        video.removeEventListener('loadedmetadata', reveal)
        video.removeEventListener('error', reveal)
        if (previousPoster === null) video.removeAttribute('poster')
        else video.setAttribute('poster', previousPoster)
        wrapper.removeAttribute('aria-busy')
        delete wrapper.dataset.holmiumVideoPreview
        delete wrapper.dataset.holmiumVideoReady
    }
}

function connectIntrinsicVideoFallback(video: HTMLVideoElement): () => void {
    const container = video.parentElement
    if (!container) return () => undefined

    const previousHeight = container.style.height
    const previousAspectRatio = container.style.aspectRatio
    const previousTransition = container.style.transition
    let frameId: number | undefined

    const finish = (event?: TransitionEvent) => {
        if (event && event.propertyName !== 'height') return
        container.style.height = 'auto'
        container.style.transition = previousTransition
        container.removeEventListener('transitionend', finish)
    }

    const resize = () => {
        const currentHeight = container.getBoundingClientRect().height
        const targetHeight = calculateVideoDisplayHeight(
            container.getBoundingClientRect().width,
            video.videoWidth,
            video.videoHeight,
        )
        if (targetHeight === null) return

        container.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(targetHeight - currentHeight) < 0.5) {
            finish()
            return
        }

        container.style.height = `${currentHeight}px`
        container.style.transition = `height ${VIDEO_REVEAL_DURATION_MS}ms ease-out`
        container.addEventListener('transitionend', finish)
        frameId = window.requestAnimationFrame(() => {
            container.style.height = `${targetHeight}px`
        })
    }

    if (video.readyState >= 1) resize()
    else video.addEventListener('loadedmetadata', resize, { once: true })

    return () => {
        video.removeEventListener('loadedmetadata', resize)
        container.removeEventListener('transitionend', finish)
        if (frameId !== undefined) window.cancelAnimationFrame(frameId)
        container.style.height = previousHeight
        container.style.aspectRatio = previousAspectRatio
        container.style.transition = previousTransition
    }
}

export default function VideoPreviews({ recordMap }: { recordMap: ExtendedRecordMap }) {
    const descriptors = useMemo(
        () => collectVideoPreviewDescriptors(recordMap, mapNotionImageUrl),
        [recordMap],
    )
    const styleSheet = useMemo(() => buildVideoPreviewStyleSheet(descriptors), [descriptors])

    useEffect(() => {
        const disconnect = descriptors.map(connectVideoPreview)
        const fallbackVideos = document.querySelectorAll<HTMLVideoElement>('.notion-asset-wrapper-video > div > video')
        for (const video of fallbackVideos) {
            const wrapper = video.closest<HTMLElement>('.notion-asset-wrapper-video')
            if (wrapper?.dataset.holmiumVideoPreview !== 'true') {
                disconnect.push(connectIntrinsicVideoFallback(video))
            }
        }

        return () => disconnect.forEach((cleanup) => cleanup())
    }, [descriptors])

    return styleSheet ? <style>{styleSheet}</style> : null
}
