const POST_ORIGIN_KEY = 'holmium:post-origin'

export interface PostOrigin {
    source: string
    target: string
}

type LocationLike = Pick<Location, 'origin' | 'pathname' | 'search' | 'hash'>

export function buildPostOrigin(location: LocationLike, href: string): PostOrigin {
    const targetUrl = new URL(href, location.origin)
    return {
        source: `${location.pathname}${location.search}${location.hash}`,
        target: `${targetUrl.pathname}${targetUrl.search}`,
    }
}

export function clearPostOrigin() {
    try {
        sessionStorage.removeItem(POST_ORIGIN_KEY)
    } catch {}
}

export function rememberPostOrigin(href: string) {
    const origin = buildPostOrigin(window.location, href)

    try {
        sessionStorage.setItem(POST_ORIGIN_KEY, JSON.stringify(origin))
    } catch {}
}

export function consumePostOrigin(): PostOrigin | null {
    try {
        const value = sessionStorage.getItem(POST_ORIGIN_KEY)
        sessionStorage.removeItem(POST_ORIGIN_KEY)
        if (!value) return null

        const origin = JSON.parse(value) as Partial<PostOrigin>
        if (typeof origin.source !== 'string' || typeof origin.target !== 'string') return null
        if (!origin.source.startsWith('/') || origin.source.startsWith('//')) return null

        return origin as PostOrigin
    } catch {
        return null
    }
}
