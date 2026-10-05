'use client'

import { useEffect } from 'react'

import { ArrowLeftIcon } from '@/components/Icons'
import SmoothLink from '@/components/SmoothLink'
import config from '@/blog.config'
import locale from '@/lib/locale'

type ErrorPageProps = {
    error: Error & { digest?: string }
    reset: () => void
}

export default function ErrorPage({ reset }: ErrorPageProps) {
    useEffect(() => {
        document.title = config.title
    }, [])

    return (
        <section className="flex w-full grow flex-col items-center justify-center px-4 text-center" role="alert">
            <h1 className="mt-10 text-5xl text-black dark:text-white">500</h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">{locale.PAGE.ERROR_500.TITLE}</p>

            <div className="mt-5 flex items-center gap-6 font-medium">
                <SmoothLink
                    href={config.path || '/'}
                    className="inline-flex items-center gap-1.5 text-gray-500 transition-colors hover:text-theme focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-theme dark:text-gray-400 dark:hover:text-theme"
                >
                    <ArrowLeftIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    {locale.PAGE.ERROR_500.HOME}
                </SmoothLink>
                <button
                    type="button"
                    onClick={reset}
                    className="cursor-pointer text-gray-500 transition-colors hover:text-theme focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-theme dark:text-gray-400 dark:hover:text-theme"
                >
                    {locale.PAGE.ERROR_500.RETRY}
                </button>
            </div>
        </section>
    )
}
