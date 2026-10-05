import config from '@/blog.config'
import { formatPublicationDate } from '@/lib/blog/publicationDate'

export default function FormattedDate({ date, className }: { date: Date | number | string; className?: string }) {
    const isoDate = new Date(date).toISOString()
    const labels = formatPublicationDate(new Date(isoDate), new Date(), config.locale, config.timezone)

    return (
        <time className={className} dateTime={isoDate} title={labels.full}>
            {labels.display}
        </time>
    )
}
