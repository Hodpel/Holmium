import { NotionFragment } from '@/components/notion'
import MomentsYear from '@/components/special-pages/MomentsYear'
import { Timeline, TimelineMonth } from '@/components/special-pages/Timeline'
import type { MomentYear } from '@/lib/special-pages/moments'

const COLLAPSE_THRESHOLD = 6

export default function MomentsTimeline({ years, currentYear, locale, timeZone, label, emptyLabel }: {
    years: readonly MomentYear[]
    currentYear: string
    locale: string
    timeZone: string
    label: string
    emptyLabel: string
}) {
    if (years.length === 0) return <p className="holmium-timeline-empty">{emptyLabel}</p>
    const dayFormatter = new Intl.DateTimeFormat(locale, { timeZone, day: 'numeric' })

    return (
        <Timeline label={label}>
            {years.map((year) => (
                <MomentsYear
                    key={year.id}
                    id={year.id}
                    initiallyOpen={year.id === currentYear || year.momentCount <= COLLAPSE_THRESHOLD}
                >
                    {year.months.map((month) => (
                        <TimelineMonth className="holmium-moments-month" key={month.key} title={month.label}>
                            {month.moments.map((moment) => (
                                <article className="holmium-moment" key={moment.id}>
                                    <time dateTime={new Date(moment.publishedAt).toISOString()}>{dayFormatter.format(moment.publishedAt)}</time>
                                    <span aria-hidden="true" className="holmium-moment-node" />
                                    <div className="holmium-moment-body">
                                        <NotionFragment blockIds={moment.blockIds} fragmentId={`moment-${moment.id}`} />
                                    </div>
                                </article>
                            ))}
                        </TimelineMonth>
                    ))}
                </MomentsYear>
            ))}
        </Timeline>
    )
}
