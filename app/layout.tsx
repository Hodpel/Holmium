import type { Metadata } from 'next'
import { Source_Serif_4, IBM_Plex_Sans } from 'next/font/google'

import config from '@/blog.config'

import ContextLayout from '@/components/ContextLayout'

import Header from '@/components/Header'
import Footer from '@/components/Footer'

import './globals.css'
import './notion.css'

const fontSerif = Source_Serif_4({
    variable: '--font-serif',
    subsets: ['latin'],
    weight: 'variable',
    style: ['normal', 'italic'],
    display: 'swap',
    fallback: ['Noto Serif SC', 'Times New Roman', 'SimSun', 'serif'],
})

const fontSans = IBM_Plex_Sans({
    variable: '--font-sans',
    subsets: ['latin'],
    weight: 'variable',
    style: ['normal', 'italic'],
    display: 'swap',
    fallback: ['Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
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

export default async function RootLayout({
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
                <ContextLayout>
                    <div className={`wrapper ${config.font === 'serif' ? 'font-serif' : 'font-sans'}`}>
                        <Header />
                        <main className="grow self-stretch flex flex-col items-center lg:flex-row lg:items-stretch">{children}</main>
                        <Footer />
                    </div>
                </ContextLayout>
            </body>
        </html>
    )
}
