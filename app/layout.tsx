import type { Metadata } from 'next'
import { Source_Serif_4, IBM_Plex_Sans } from 'next/font/google'

import { config } from '@/blog.config'

import { Providers } from '@/lib/theme/themeProvider'

import Header from '@/components/Header'
import Footer from '@/components/Footer'

import './globals.css'

const fontSerif = Source_Serif_4({
    variable: '--font-serif',
    subsets: ['latin'],
    weight: ['200', '900'],
    style: ['normal', 'italic'],
    display: 'swap',
})

const fontSans = IBM_Plex_Sans({
    variable: '--font-sans',
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    style: ['normal', 'italic'],
    display: 'swap',
})

const fontClass = config.font === 'serif' ? fontSerif.variable : fontSans.variable

export const metadata: Metadata = {
    title: {
        default: config.title,
        template: `%s | ${config.title}`,
    },
    // icons: {
    //     icon: '/special-favicon.ico',
    // },
    // alternates: {
    //     types: {
    //         'application/rss+xml': [{ title: 'RSS 2.0', url: '/feed' }],
    //     },
    // },
    description: config.description,
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang={config.locale} className={`${fontClass} `} suppressHydrationWarning>
            <head>
                {config.appearance === 'auto' ? (
                    <>
                        <meta name="theme-color" media="(prefers-color-scheme: light)" content={config.lightBackground} />
                        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={config.darkBackground} />
                    </>
                ) : (
                    <meta name="theme-color" content={config.appearance === 'dark' ? config.darkBackground : config.lightBackground} />
                )}
            </head>
            <body className="text-foreground min-h-screen bg-light dark:bg-dark">
                <Providers>
                    <div className="wrapper font-var">
                        <Header />
                        <main className="grow">{children}</main>
                        <Footer />
                    </div>
                </Providers>
            </body>
        </html>
    )
}
