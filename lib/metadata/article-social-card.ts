import 'server-only'

import getPostsList from '@/lib/notion/getPostsList'
import { renderCard } from './social-card'

export async function renderSocialCard(slug: string) {
    const entries = await getPostsList({ includePages: true })
    const entry = entries.find(candidate => candidate.slug === slug)
    return entry ? renderCard(entry.title) : null
}
