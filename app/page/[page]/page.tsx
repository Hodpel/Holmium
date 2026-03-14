import config from '@/blog.config'
import Pagination from '@/components/Pagination'
import PostItem from '@/components/PostIems'

import getPostsList from '@/lib/notion/getPostsList'
// export const revalidate = 1
export const revalidate = 100

export default async function Page({ params }: { params: { page: number } }) {
    const { page } = await params
    const postsList = await getPostsList({ includePages: false })
    const displayedPosts = postsList.slice(config.postsPerPage * (page - 1), config.postsPerPage * page)
    const totalPosts = postsList.length
    const showPagination = page * config.postsPerPage < totalPosts

    return (
        <>
            <div className="flex-1 hidden lg:block" />
            <div className="flex-none w-full max-w-2xl px-4">
                {displayedPosts.map((post) => (
                    <PostItem key={post.id} post={post} />
                ))}
                <Pagination page={page} showPagination={showPagination} />
            </div>
            <div className="flex-1 hidden lg:block" />
        </>
    )
}
