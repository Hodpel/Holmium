const compact = (id: string) => id.replaceAll('-', '').toLowerCase()

export function shortSubpageId(id: string, siblingIds: readonly string[]): string {
    const full = compact(id)
    let length = 4
    while (length < full.length && siblingIds.some(other => compact(other) !== full && compact(other).endsWith(full.slice(-length)))) length += 2
    return full.slice(-length)
}

export function findSubpageBySegment(segment: string, siblingIds: readonly string[]): string | null {
    const suffix = segment.match(/-([a-f0-9]{4}(?:[a-f0-9]{2}){0,14})$/i)?.[1]?.toLowerCase()
    if (!suffix) return null
    const matches = siblingIds.filter(id => compact(id).endsWith(suffix))
    return matches.length === 1 ? matches[0] : null
}

export function readableSubpageHref(parentSlug: string, title: string, id: string, siblingIds: readonly string[]): string {
    // Literal percent signs are excluded by the site's route contract.
    const label = (title.trim() || '未命名').replaceAll('%', '％')
    return `/${encodeURIComponent(parentSlug)}/${encodeURIComponent(label)}-${shortSubpageId(id, siblingIds)}`
}
