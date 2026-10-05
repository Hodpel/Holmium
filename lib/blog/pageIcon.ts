export function resolvePageIconSource(
    iconSource: string,
    pageId: string,
    theme: 'light' | 'dark',
    notionHost: string,
): string | null {
    if (iconSource.startsWith('/icons/')) return `https://${notionHost}${iconSource}?mode=${theme}`
    if (iconSource.startsWith('https://') || iconSource.startsWith('http://')) return iconSource
    if (iconSource.startsWith('attachment:')) {
        return `https://${notionHost}/image/${encodeURIComponent(iconSource)}?id=${pageId}&table=block&width=40`
    }
    return null
}
