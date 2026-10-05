import { parsePageId } from 'notion-utils'

import type { BlogEntrySummary } from '../blog/types'
import type { ResolvedSpecialPage, SpecialPageConfig } from './types'

export type SpecialPageConfigErrorCode =
    | 'UNSUPPORTED_TYPE'
    | 'DUPLICATE_TYPE'
    | 'DUPLICATE_PAGE'
    | 'INVALID_PAGE_ID'
    | 'PAGE_NOT_FOUND'
    | 'INVALID_PAGE_KIND'

export class SpecialPageConfigError extends Error {
    readonly code: SpecialPageConfigErrorCode

    constructor(code: SpecialPageConfigErrorCode, message: string) {
        super(`Special page config ${code}: ${message}`)
        this.name = 'SpecialPageConfigError'
        this.code = code
    }
}

function normalizePageId(pageId: string): string | null {
    return parsePageId(pageId.trim(), { uuid: true }) || null
}

const SPECIAL_PAGE_TYPES = new Set<SpecialPageConfig['type']>(['archive', 'moments'])

export function buildSpecialPageRegistry(
    configs: readonly SpecialPageConfig[],
    entries: readonly BlogEntrySummary[],
): ReadonlyMap<string, ResolvedSpecialPage> {
    const registry = new Map<string, ResolvedSpecialPage>()
    const configuredTypes = new Set<SpecialPageConfig['type']>()
    const configuredPages = new Set<string>()
    const entriesById = new Map(entries.map((entry) => [normalizePageId(entry.id), entry]))

    for (const config of configs) {
        if (!SPECIAL_PAGE_TYPES.has((config as { type: SpecialPageConfig['type'] }).type)) {
            throw new SpecialPageConfigError(
                'UNSUPPORTED_TYPE',
                `${JSON.stringify((config as { type: string }).type)} is not supported`,
            )
        }
        if (configuredTypes.has(config.type)) {
            throw new SpecialPageConfigError('DUPLICATE_TYPE', `${config.type} may only be configured once`)
        }
        configuredTypes.add(config.type)

        const pageId = normalizePageId(config.pageId)
        if (!pageId) {
            throw new SpecialPageConfigError('INVALID_PAGE_ID', `${JSON.stringify(config.pageId)} is not a Notion page ID`)
        }
        if (configuredPages.has(pageId)) {
            throw new SpecialPageConfigError('DUPLICATE_PAGE', `page ${pageId} may only be assigned to one special page type`)
        }
        configuredPages.add(pageId)

        const page = entriesById.get(pageId)
        if (!page) throw new SpecialPageConfigError('PAGE_NOT_FOUND', `page ${pageId} is not in the published blog index`)
        if (config.type === 'archive' && page.kind !== 'page') {
            throw new SpecialPageConfigError('INVALID_PAGE_KIND', `page ${pageId} has kind ${page.kind}; expected page`)
        }

        registry.set(pageId, { type: config.type, page })
    }

    return registry
}
