/**
 * Next may expose a dynamic route segment either decoded or still percent-encoded
 * during different rendering phases. Decode at most once so both forms resolve to
 * the same Notion slug while malformed input continues to miss normally.
 */
export function decodeRouteSlug(slug: string): string {
    try {
        return decodeURIComponent(slug)
    } catch {
        return slug
    }
}
