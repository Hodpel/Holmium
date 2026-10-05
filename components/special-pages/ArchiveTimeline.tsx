import config from '@/blog.config'
import { PostEntryLink } from '@/components/entry/EntryNavigation'
import PageMentionIcon from '@/components/notion/PageMentionIcon'
import { Timeline, TimelineMonth, TimelineYear } from '@/components/special-pages/Timeline'
import type { ArchiveYear } from '@/lib/special-pages/archive'

export default function ArchiveTimeline({
    years,
    label,
    emptyLabel,
}: {
    years: readonly ArchiveYear[]
    label: string
    emptyLabel: string
}) {
    if (years.length === 0) return <p className="holmium-timeline-empty">{emptyLabel}</p>

    return (
        <Timeline label={label}>
            {years.map((year) => (
                <TimelineYear key={year.id} id={year.id} title={year.id}>
                    {year.months.map((month) => (
                        <TimelineMonth key={month.key} title={month.label}>
                            {month.posts.map((post) => (
                                <div className="holmium-archive-post" key={post.id}>
                                    <time dateTime={post.dateTime}>{post.day}</time>
                                    <PostEntryLink className="notion-link holmium-archive-post-link" href={`${config.path}/${post.slug}`}>
                                        <span className="notion-page-title">
                                            <PageMentionIcon icon={post.icon} pageId={post.id} title={post.title} />
                                            <span className="notion-page-title-text">{post.title}</span>
                                        </span>
                                    </PostEntryLink>
                                </div>
                            ))}
                        </TimelineMonth>
                    ))}
                </TimelineYear>
            ))}
        </Timeline>
    )
}
