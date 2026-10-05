export type PublicationDateLabels = {
    display: string
    full: string
}

function yearInZone(date: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('en-US-u-ca-gregory', {
        year: 'numeric',
        timeZone,
    }).format(date)
}

function formatter(locale: string, timeZone: string, includeYear: boolean) {
    return new Intl.DateTimeFormat(locale, {
        ...(includeYear ? { year: 'numeric' as const } : {}),
        month: 'short',
        day: 'numeric',
        timeZone,
    })
}

export function formatPublicationDate(
    date: Date,
    now: Date,
    locale: string,
    timeZone: string,
): PublicationDateLabels {
    const full = formatter(locale, timeZone, true).format(date)
    const sameYear = yearInZone(date, timeZone) === yearInZone(now, timeZone)

    return {
        display: sameYear ? formatter(locale, timeZone, false).format(date) : full,
        full,
    }
}
