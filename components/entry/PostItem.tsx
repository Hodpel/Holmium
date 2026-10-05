import config from '@/blog.config'
import type { BlogEntrySummary } from '@/lib/blog/types'
import PageIcon from '@/components/entry/PageIcon'
import FormattedDate from '@/components/entry/FormattedDate'
import ExpandablePostEntry from '@/components/entry/ExpandablePostEntry'
import SummaryText from '@/components/entry/SummaryText'
import locale from '@/lib/locale'

const PostItem = ({ post }: { post: BlogEntrySummary }) => {
    const initialDateSnapshot = new Date().toISOString()

    return (
        <ExpandablePostEntry
            href={`${config.path}/${post.slug}`}
            summaryText={post.summary}
            icon={<PageIcon post={post} />}
            header={<PostHeader post={post} />}
            summary={post.summary ? <SummaryText text={post.summary} parts={post.summaryParts} initialDateSnapshot={initialDateSnapshot} /> : null}
            expandLabel={locale.POST.SUMMARY_EXPAND}
            collapseLabel={locale.POST.SUMMARY_COLLAPSE}
        />
    )
}

function PostHeader({ post }: { post: BlogEntrySummary }) {
    return (
        <header className="flex min-w-0 flex-col justify-between md:flex-row md:items-baseline">
            <h2
                className="holmium-post-entry-title min-w-0 flex-1 cursor-pointer text-lg font-bold text-black dark:text-gray-100 md:mb-2 md:text-3xl"
                title={post.title}
            >
                <span className="line-clamp-2 [overflow-wrap:anywhere]">{post.title}</span>
            </h2>
            <FormattedDate className="shrink-0 text-gray-500 dark:text-gray-400 md:ml-4" date={post.publishedAt} />
        </header>
    )
}

export default PostItem
