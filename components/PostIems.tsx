import Link from 'next/link'
import config from '@/blog.config'
import locale from '@/lib/locale'
import { PageProperties } from '@/lib/types'
import PageIcon from '@/components/PageIcon'
import FormattedDate from '@/components/FormattedDate'

const PostItem = ({ post }: { post: PageProperties }) => {
    return (
        <Link scroll={false} href={`${config.path}/${post.slug}`}>
            <article key={post.id} className="group mb-6 md:mb-8 flex flex-row gap-4 items-start">
                <div className="relative h-9 w-9 shrink-0">
                    <PageIcon post={post} />
                </div>
                <div className="flex-1 min-w-0">
                    <header className="flex flex-col justify-between md:flex-row md:items-baseline">
                        <h2 className="flex items-center gap-2 text-lg md:text-3xl font-bold mb-2 cursor-pointer text-black dark:text-gray-100 group-hover:text-theme min-w-0 flex-1 transition ">
                            <span className="wrap-break-word">{post.title}</span>
                        </h2>
                        <time className="shrink-0 text-gray-500 dark:text-gray-400">
                            <FormattedDate date={post.date} />
                        </time>
                    </header>
                    <main>
                        <p className="hidden md:block leading-8 text-gray-700 dark:text-gray-300">{post.summary}</p>
                    </main>
                </div>
            </article>
        </Link>
    )
}

export default PostItem
