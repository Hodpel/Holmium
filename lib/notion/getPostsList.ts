import config from '@/blog.config'
import { PageProperties, PostsList } from '@/lib/types'
import notion from './notionAPI'
import { getBlockValue, getBlockCollectionId, getPageProperty, getAllPagesInSpace } from 'notion-utils'
import getPostIds from './getPostIds'

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

    // getAllPagesInSpace()获取的postIds顺序可能与数据库不符,下面的方法用于获取数据库中页面ID
    const collectionPostIds = getPostIds(postMap[postIds[0]]!)

    for (const id of collectionPostIds) {
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
        postsList.sort((a, b) => {
            const dateA = a.date instanceof Date ? a.date : new Date(a.date)
            const dateB = b.date instanceof Date ? b.date : new Date(b.date)

            if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
                return 0
            }

            return dateB.getTime() - dateA.getTime()
        })
    }
    return postsList
}
