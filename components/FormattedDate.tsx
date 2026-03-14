'use client'

import config from '@/blog.config'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'

dayjs.extend(localizedFormat)

const loaded: {
    [key: string]: boolean | Promise<unknown> | undefined
} = {}

export default function FormattedDate({ date }: { date: Date | number }) {
    const lang = config.locale.slice(0, 2)
    const [isLocaleLoaded, setIsLocaleLoaded] = useState(loaded[lang] === true)
    const [formatted, setFormatted] = useState('') // 服务端为空

    useEffect(() => {
        const loadLocale = async () => {
            if (isLocaleLoaded) {
                setFormatted(dayjs(date).format('ll'))
                return
            }

            try {
                if (!loaded[lang]) {
                    await import(`dayjs/locale/${lang}`)
                    loaded[lang] = true
                    dayjs.locale(lang)
                    setIsLocaleLoaded(true)
                    setFormatted(dayjs(date).format('ll'))
                } else if (loaded[lang] === true) {
                    setIsLocaleLoaded(true)
                    setFormatted(dayjs(date).format('ll'))
                }
            } catch {
                console.warn(`dayjs locale \`${lang}\` not found`)
                loaded[lang] = false
            }
        }

        loadLocale()
    }, [lang, date])

    return <span>{formatted || '...'}</span>
}
