import { notFound, permanentRedirect } from 'next/navigation'
import { getSubpageSnapshot } from '@/lib/notion/getPostsList'

export const revalidate = 300

export default async function LegacySubpage({ params }: { params: Promise<{ parentId: string; pageId: string }> }) {
    const { parentId, pageId } = await params
    const data = await getSubpageSnapshot(parentId, pageId)
    if (!data) notFound()
    permanentRedirect(`/${data.post.slug}`)
}
