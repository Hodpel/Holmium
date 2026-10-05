import { defaultMapImageUrl } from 'notion-utils'
import type { Block } from 'notion-types'

export function mapNotionImageUrl(url: string | undefined, block: Block): string | undefined {
    if (!url) return undefined

    // Server-side transport projections remove space_id before passing a
    // local asset URL. Normal Notion blocks keep using the canonical mapper.
    if (url.startsWith('/') && !block.space_id) return url
    return defaultMapImageUrl(url, block)
}
