type FrameTarget = EventTarget & Pick<HTMLVideoElement, 'requestVideoFrameCallback' | 'cancelVideoFrameCallback'>

export function watchFirstFrame(video: FrameTarget, onFrame: () => void): () => void {
    let alive = true, presented = false
    let request: number | undefined
    const playing = () => {
        if (presented || request !== undefined || !alive) return
        request = video.requestVideoFrameCallback(() => {
            request = undefined
            if (!alive || presented) return
            presented = true
            onFrame()
        })
    }
    video.addEventListener('playing', playing)
    return () => {
        alive = false
        video.removeEventListener('playing', playing)
        if (request !== undefined) video.cancelVideoFrameCallback(request)
    }
}

// Older browsers cannot report compositor frames. Verify decoded pixels and
// cross a paint boundary instead; never turn a fixed timeout into readiness.
export function watchDecodedFrame(video: HTMLVideoElement, onFrame: () => void): () => void {
    const window = video.ownerDocument.defaultView
    if (!window) return () => {}
    let alive = true, playing = false, request: number | undefined
    const sample = video.ownerDocument.createElement('canvas')
    sample.width = sample.height = 1
    const context = sample.getContext('2d')
    const check = () => {
        request = undefined
        if (!alive || !playing || video.error || video.readyState < 2 || !video.videoWidth || !video.videoHeight || !context) return
        try { context.drawImage(video, 0, 0, 1, 1) } catch { return }
        request = window.requestAnimationFrame(() => {
            request = undefined
            if (!alive || video.error || video.readyState < 2) return
            alive = false; onFrame()
        })
    }
    const schedule = () => { if (alive && playing && request === undefined) request = window.requestAnimationFrame(check) }
    const start = () => { playing = true; schedule() }
    video.addEventListener('playing', start)
    video.addEventListener('loadeddata', schedule)
    video.addEventListener('timeupdate', schedule)
    return () => {
        alive = false
        if (request !== undefined) window.cancelAnimationFrame(request)
        video.removeEventListener('playing', start); video.removeEventListener('loadeddata', schedule); video.removeEventListener('timeupdate', schedule)
    }
}

export function retainVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): boolean {
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return false
    // Draw into a temporary buffer first: resizing the retained canvas clears
    // it, so a failed copy must not destroy the previous usable frame.
    const buffer = canvas.ownerDocument.createElement('canvas')
    const context = buffer.getContext('2d')
    const destination = canvas.getContext('2d')
    if (!context || !destination) return false
    try {
        buffer.width = video.videoWidth; buffer.height = video.videoHeight
        context.drawImage(video, 0, 0)
        canvas.width = buffer.width; canvas.height = buffer.height
        destination.drawImage(buffer, 0, 0)
        return true
    } catch { return false }
}

type PlaybackOptions = {
    kind: 'video' | 'audio'; onFramePresented(): void
    onFailure(reason: 'module' | 'source' | 'activation'): void
    frozenFrame: HTMLCanvasElement | null; onFrozenChange(frozen: boolean): void
}

export function bindFilePlayback(target: HTMLMediaElement, options: PlaybackOptions) {
    let alive = true, hadFrame = false, frozen = false
    let inFlight: Promise<void> | null = null
    let stopFrames = () => {}
    const video = options.kind === 'video' ? target as HTMLVideoElement : null
    const capture = () => {
        if (video && options.frozenFrame && retainVideoFrame(video, options.frozenFrame)) {
            frozen = true; options.onFrozenChange(true)
        }
        return frozen
    }
    const fail = () => { if (alive) { stopFrames(); target.pause(); capture(); options.onFailure('source') } }
    const presented = () => {
        if (!alive) return
        hadFrame = true; frozen = false; options.onFrozenChange(false); options.onFramePresented()
    }
    const arm = () => {
        stopFrames()
        if (video) stopFrames = typeof video.requestVideoFrameCallback === 'function' ? watchFirstFrame(video, presented) : watchDecodedFrame(video, presented)
    }
    const playing = () => { if (!video) presented() }
    target.addEventListener('playing', playing)
    target.addEventListener('error', fail)
    arm()
    return {
        play(): Promise<void> {
            if (!alive) return Promise.resolve()
            if (inFlight) return inFlight
            if (target.error) {
                if (video && hadFrame && !capture()) { options.onFailure('source'); return Promise.resolve() }
                target.pause(); target.load()
            }
            arm()
            try {
                inFlight = Promise.resolve(target.play()).catch(error => {
                    if (alive) { stopFrames(); options.onFailure(error?.name === 'NotAllowedError' ? 'activation' : 'source') }
                }).finally(() => { inFlight = null })
                return inFlight
            } catch { options.onFailure('source'); return Promise.resolve() }
        },
        dispose() { alive = false; stopFrames(); target.pause(); target.removeEventListener('playing', playing); target.removeEventListener('error', fail) },
    }
}
