import { dateInZone } from './dateFormat.ts'

/** Stable snapshot until a relevant timezone crosses midnight. */
export function createDateClock(zones: readonly string[], now = () => new Date()) {
    let days = ''
    let snapshot = ''
    return () => {
        const instant = now()
        const current = zones.map(zone => dateInZone(instant, zone)).join('|')
        if (current !== days) { days = current; snapshot = instant.toISOString() }
        return snapshot
    }
}
