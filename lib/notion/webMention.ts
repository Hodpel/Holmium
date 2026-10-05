export const WEB_MENTION_PREFIX = 'holmium-web-mention:'

export function webMentionUrl(value: unknown): string | undefined {
    if (typeof value !== 'string') return
    try {
        const url = new URL(value)
        if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return url.href
    } catch { /* Invalid metadata should not become a resource request. */ }
}

export function readWebMention(value: unknown) {
    const data = value && typeof value === 'object' ? value as Record<string, unknown> : {}
    const text = (key: string) => typeof data[key] === 'string' ? data[key] as string : undefined
    return { href: webMentionUrl(data.href), title: text('title') || '链接',
        icon: webMentionUrl(data.icon_url), thumbnail: webMentionUrl(data.thumbnail_url),
        description: text('description'), provider: text('link_provider') }
}
