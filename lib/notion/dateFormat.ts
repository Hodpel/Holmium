import type { FormattedDate } from 'notion-types'

export type NotionDate = FormattedDate & { time_format?: string }
export type DateFormatContext = { now?: Date; timeZone?: string }
const DAY = 86400000

function calendarDate(text: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
    const date = new Date(`${text}T00:00:00Z`)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === text ? date : null
}

export function dateInZone(now: Date, zone: string): string {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
    const part = (type: string) => parts.find(p => p.type === type)!.value
    return `${part('year')}-${part('month')}-${part('day')}`
}

export function validDateZone(zone: string | undefined, fallback = 'UTC'): string {
    try {
        if (zone) { new Intl.DateTimeFormat('en', { timeZone: zone }); return zone }
    } catch { /* Fall back to the site's zone for malformed Notion metadata. */ }
    return fallback
}

function dateLabel(date: Date, value: NotionDate, locale: string, context: DateFormatContext): string {
    const kind = value.date_format
    if (kind === 'relative' && context.now) {
        const today = calendarDate(dateInZone(context.now, validDateZone(value.time_zone, context.timeZone || 'UTC')))!
        const delta = Math.round((date.getTime() - today.getTime()) / DAY)
        if (Math.abs(delta) <= 1) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(delta, 'day')
        const monday = today.getTime() - ((today.getUTCDay() + 6) % 7) * DAY
        const week = Math.floor((date.getTime() - monday) / (7 * DAY))
        if (week >= -1 && week <= 1) {
            if (locale.toLowerCase().startsWith('zh')) {
                const day = ['日', '一', '二', '三', '四', '五', '六'][date.getUTCDay()]
                return `${week === -1 ? '上周' : week === 1 ? '下周' : '周'}${day}`
            }
            const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(date)
            if (locale.toLowerCase().startsWith('en')) return `${week === -1 ? 'Last ' : week === 1 ? 'Next ' : ''}${weekday}`
            return `${new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(week, 'week')} ${weekday}`
        }
    }
    const [year, month, day] = date.toISOString().slice(0, 10).split('-')
    if (kind === 'MM/DD/YYYY') return `${month}/${day}/${year}`
    if (kind === 'DD/MM/YYYY') return `${day}/${month}/${year}`
    if (kind === 'YYYY/MM/DD') return `${year}/${month}/${day}`
    const short = kind === 'MMM d'
    // Use a compact dotted month/day for Chinese short dates.
    if (short && locale.toLowerCase().startsWith('zh')) return `${Number(month)}.${Number(day)}`
    return new Intl.DateTimeFormat(locale, {
        ...(short ? {} : { year: 'numeric' as const }), month: short || kind === 'll' ? 'short' : 'long', day: 'numeric', timeZone: 'UTC',
    }).format(date)
}

function timeLabel(time: string | undefined, value: NotionDate, locale: string): string | null {
    if (!time) return null
    const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time)
    if (!match || +match[1] > 23 || +match[2] > 59) return null
    const hour12 = value.time_format ? /[haA]/.test(value.time_format) : undefined
    return new Intl.DateTimeFormat(locale, {
        hour: 'numeric', minute: '2-digit', timeZone: 'UTC',
        ...(hour12 === undefined ? {} : { hour12 }),
    }).format(new Date(Date.UTC(2000, 0, 1, +match[1], +match[2])))
}

export function formatNotionDate(value: NotionDate, locale: string, context: DateFormatContext = {}): string | null {
    const startDate = calendarDate(value.start_date)
    if (!startDate) return null
    const startTime = timeLabel(value.start_time, value, locale)
    const start = `${dateLabel(startDate, value, locale, context)}${startTime ? ` ${startTime}` : ''}`
    if (!value.end_date) return start
    const endDate = calendarDate(value.end_date)
    if (!endDate) return start
    const endTime = timeLabel(value.end_time, value, locale)
    const end = value.end_date === value.start_date && startTime && endTime
        ? endTime : `${dateLabel(endDate, value, locale, context)}${endTime ? ` ${endTime}` : ''}`
    return `${start} → ${end}`
}
