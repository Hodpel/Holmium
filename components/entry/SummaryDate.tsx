'use client'

import config from '@/blog.config'
import { formatNotionDate, validDateZone, type NotionDate } from '@/lib/notion/dateFormat'
import { useSingleDateClock } from '../notion/useDateClock'

export default function SummaryDate({ value, initialDateSnapshot }: { value: NotionDate; initialDateSnapshot: string }) {
    const snapshot = useSingleDateClock(validDateZone(value.time_zone, config.timezone), initialDateSnapshot)
    const text = formatNotionDate(value, config.locale, {
        now: snapshot ? new Date(snapshot) : undefined, timeZone: config.timezone,
    })
    return <span className="text-gray-500 dark:text-gray-400">{text}</span>
}
