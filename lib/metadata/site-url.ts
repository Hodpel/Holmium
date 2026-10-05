export function getMetadataBase(value: string): URL {
    const trimmed = value.trim()
    if (!trimmed) throw new Error('blog.config.ts siteUrl must not be empty.')

    let url: URL
    try {
        url = new URL(trimmed)
    } catch {
        throw new Error(`blog.config.ts siteUrl must be an absolute HTTP(S) URL; received: ${value}`)
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`blog.config.ts siteUrl must use HTTP or HTTPS; received: ${url.protocol}`)
    }
    if (url.username || url.password || url.search || url.hash) {
        throw new Error('blog.config.ts siteUrl must not contain credentials, a query string, or a hash.')
    }

    url.pathname = `${url.pathname.replace(/\/+$/, '')}/`
    return url
}

export function buildSiteUrl(siteUrl: string, pathname = '/'): string {
    const base = getMetadataBase(siteUrl)
    const basePath = base.pathname.replace(/\/+$/, '')
    const routePath = pathname === '/' ? '' : `/${pathname.replace(/^\/+/, '')}`

    base.pathname = routePath ? `${basePath}${routePath}` : `${basePath}/`
    base.search = ''
    base.hash = ''
    return base.toString()
}
