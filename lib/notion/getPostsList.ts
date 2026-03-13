import config from '@/blog.config'
import { PageProperties, PostsList } from '@/lib/types'
import notion from './notionAPI'
import { getBlockValue, getBlockCollectionId, getPageProperty, getAllPagesInSpace } from 'notion-utils'

async function getPage(pageId: string) {
    return notion.getPage(pageId)
}

function filterPublishedPosts({ postList, includePages }: { postList: PostsList; includePages: boolean }) {
    if (!postList || !postList.length) return []
    return postList
        .filter((post) => (includePages ? post?.type === 'Post' || post?.type === 'Page' : post?.type === 'Post'))
        .filter((post) => post.title && post.slug && post?.status === 'Published' && post.date <= new Date())
}

export default async function getPostsList({ includePages = false }: { includePages?: boolean }): Promise<PostsList> {
    const pageId = config.notionPageId
    let postsList: PostsList = []
    const propKeys = ['title', 'slug', 'tags', 'date', 'summary', 'status', 'type'] as const

    const postMap = await getAllPagesInSpace(pageId, undefined, getPage, {
        maxDepth: 1,
    })
    const postIds = Object.keys(postMap)

    for (const id of postIds) {
        const recordMap = postMap[id]!
        // const keys = Object.keys(recordMap?.block || {})
        // const block = getBlockValue(recordMap?.block?.[keys[0]!])
        const block = getBlockValue(recordMap?.block?.[id])
        if (!block || getBlockCollectionId(block, recordMap)) continue

        const properties: PageProperties = { id, date: 0 as unknown as Date, format: block.format }
        for (const key of propKeys) {
            properties[key] = getPageProperty(key, block, recordMap)
        }

        postsList.push(properties)
    }

    postsList = filterPublishedPosts({ postList: postsList, includePages })

    if (config.sortByDate) {
        postsList.sort((a, b) => b.date.getTime() - a.date.getTime())
    }
    return postsList
}
