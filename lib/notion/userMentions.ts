import type { Block, ExtendedRecordMap } from 'notion-types'
import { getBlockValue } from 'notion-utils'

export const PERSON_MENTION_PREFIX = 'holmium-person:'
export function userDisplayName(user: { name?: unknown; given_name?: unknown; family_name?: unknown; email?: unknown } | undefined, locale: string): string {
    const clean = (value: unknown) => typeof value === 'string' ? value.trim() : ''
    return clean(user?.name) || [clean(user?.given_name), clean(user?.family_name)].filter(Boolean).join(' ') ||
        (locale.startsWith('zh') ? '未知用户' : 'Unknown user')
}

export function userId(decoration: unknown): string | null {
    if (!Array.isArray(decoration)) return null
    if (decoration[0] === 'u' && typeof decoration[1] === 'string') return decoration[1]
    if (decoration[0] === '‣' && Array.isArray(decoration[1]) && decoration[1][0] === 'u' && typeof decoration[1][1] === 'string') return decoration[1][1]
    return null
}

/** Keep cached user records untouched; bypass the dependency's avatar-only renderer. */
export function normalizeUserMentions(map: ExtendedRecordMap, locale: string): ExtendedRecordMap {
    let blocks: ExtendedRecordMap['block'] | undefined
    for (const [id, record] of Object.entries(map.block)) {
        const block = getBlockValue(record)
        if (!block?.properties) continue
        let properties: Record<string, unknown> | undefined
        for (const [key, value] of Object.entries(block.properties)) {
            if (!Array.isArray(value)) continue
            let changed = false
            const text = value.map(segment => {
                if (!Array.isArray(segment?.[1])) return segment
                const person = segment[1].map(userId).find(Boolean)
                if (!person) return segment
                changed = true
                const user = getBlockValue(map.notion_user?.[person])
                const decorations = segment[1].filter((d: unknown) => !userId(d))
                decorations.push(['a', `${PERSON_MENTION_PREFIX}${encodeURIComponent(person)}`])
                return [userDisplayName(user, locale), decorations]
            })
            if (changed) {
                properties = { ...(properties ?? block.properties), [key]: text }
            }
        }
        if (!properties) continue
        blocks ??= { ...map.block }
        const normalized = { ...block, properties } as Block
        const value = record.value
        blocks[id] = (value && 'value' in value
            ? { ...record, value: { ...value, value: normalized } }
            : { ...record, value: normalized }) as typeof record
    }
    return blocks ? { ...map, block: blocks } : map
}
