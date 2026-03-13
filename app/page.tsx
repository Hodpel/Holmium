import config from '@/blog.config'
import Pagination from '@/components/Pagination'
import PostItem from '@/components/PostIems'

import getPostsList from '@/lib/notion/getPostsList'
// export const revalidate = 1
export const revalidate = 100

export default async function Blog() {
    const postsList = await getPostsList({ includePages: false })
    const displayedPosts = postsList.slice(0, config.postsPerPage)
    const totalPosts = postsList.length
    const showPagination = totalPosts > config.postsPerPage
    return (
        <>
            <div className="flex-1 hidden lg:block" />
            <div className="flex-none w-full max-w-2xl px-4">
                {displayedPosts.map((post) => (
                    <PostItem key={post.id} post={post} />
                ))}
                {showPagination && <Pagination page={1} showNext={showPagination} />}
            </div>
            <div className="flex-1 hidden lg:block" />
        </>
    )
}
