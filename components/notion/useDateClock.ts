'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { ExtendedRecordMap } from 'notion-types'
import { getBlockValue } from 'notion-utils'
import { createDateClock } from '@/lib/notion/dateClock'
import { validDateZone } from '@/lib/notion/dateFormat'

function subscribe(refresh: () => void) {
    const timer = window.setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
        window.clearInterval(timer)
        document.removeEventListener('visibilitychange', refresh)
        window.removeEventListener('focus', refresh)
    }
}
const serverSnapshot = () => ''

export function useSingleDateClock(zone: string, initialSnapshot: string) {
    const getSnapshot = useMemo(() => createDateClock([zone]), [zone])
    const serverSnapshot = useCallback(() => initialSnapshot, [initialSnapshot])
    return useSyncExternalStore(subscribe, getSnapshot, serverSnapshot)
}

export function useDateClock(map: ExtendedRecordMap, defaultZone: string) {
    const getSnapshot = useMemo(() => {
        const zones = new Set([defaultZone])
        for (const record of Object.values(map.block)) {
            const properties = getBlockValue(record)?.properties
            for (const value of Object.values(properties ?? {})) {
                if (!Array.isArray(value)) continue
                for (const segment of value) {
                    if (!Array.isArray(segment?.[1])) continue
                    for (const decoration of segment[1]) {
                        if (decoration?.[0] === 'd' && typeof decoration[1] === 'object') {
                            zones.add(validDateZone(decoration[1]?.time_zone, defaultZone))
                        }
                    }
                }
            }
        }
        return createDateClock([...zones])
    }, [map, defaultZone])
    // Cached server HTML uses absolute dates; hydration starts from that same snapshot.
    return useSyncExternalStore(subscribe, getSnapshot, serverSnapshot)
}
