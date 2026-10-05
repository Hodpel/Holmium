import type { ExtendedRecordMap } from 'notion-types'
import type { BlogIndex } from './types'

/** Publish the title and body together; a failed refresh must not produce a partial article. */
export async function resolvePostSnapshot(
    slug: string,
    index: BlogIndex,
    loadRecordMap: (id: string, revision: string) => Promise<ExtendedRecordMap>,
) {
    const post = index.entries.find(entry => entry.slug === slug)
    if (!post) return null
    const revision = index.contentRevisions[post.id]
    if (!revision) throw new Error(`Blog index is missing the content revision for page ${post.id}.`)

    const recordMap = await loadRecordMap(post.id, revision)
    return { post, recordMap }
}
