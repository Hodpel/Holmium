const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const PAGE_WRAPPER_SELECTOR = '.wrapper'
const SCROLL_TOP_EPSILON = 1
const SCROLL_RANGE_LEASE_TIMEOUT_MS = 3000

let releaseActiveScrollRange: (() => void) | null = null

function preserveCurrentScrollRange() {
    releaseActiveScrollRange?.()
    releaseActiveScrollRange = null

    if (window.scrollY <= SCROLL_TOP_EPSILON) return

    const wrapper = document.querySelector<HTMLElement>(PAGE_WRAPPER_SELECTOR)
    if (!wrapper) return

    const previousMinHeight = wrapper.style.minHeight
    let frameId: number | null = null
    let timeoutId: number | null = null
    let released = false

    const release = () => {
        if (released) return
        released = true

        if (frameId !== null) cancelAnimationFrame(frameId)
        if (timeoutId !== null) window.clearTimeout(timeoutId)

        wrapper.style.minHeight = previousMinHeight
        if (releaseActiveScrollRange === release) releaseActiveScrollRange = null
    }

    const watchScrollPosition = () => {
        if (window.scrollY <= SCROLL_TOP_EPSILON) {
            release()
            return
        }

        frameId = requestAnimationFrame(watchScrollPosition)
    }

    wrapper.style.minHeight = `${Math.ceil(window.scrollY + window.innerHeight)}px`
    timeoutId = window.setTimeout(release, SCROLL_RANGE_LEASE_TIMEOUT_MS)
    frameId = requestAnimationFrame(watchScrollPosition)
    releaseActiveScrollRange = release
}

export function scrollToPageTop() {
    preserveCurrentScrollRange()
    window.scrollTo({
        top: 0,
        behavior: window.matchMedia(REDUCED_MOTION_QUERY).matches ? 'auto' : 'smooth',
    })
}

export function navigateToPageTop(navigate: () => void) {
    scrollToPageTop()
    navigate()
}
