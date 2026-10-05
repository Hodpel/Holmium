// 外部依赖
import type { Metadata } from 'next'
import localFont from 'next/font/local'

// 配置文件
import config from '@/blog.config'
import advancedConfig from '@/config/blog.advanced'
import { buildFaviconMetadata } from '@/lib/branding/icons'
import { buildRobotsMetadata } from '@/lib/metadata/robots'
import { buildSiteUrl, getMetadataBase } from '@/lib/metadata/site-url'

// 通用布局组件
import ContextLayout from '@/components/ContextLayout'
import ThemeRuntime from '@/components/ThemeRuntime'

// 具体组件,字母排序
import Header from '@/components/Header'
import ArticleCover from '@/components/entry/ArticleCover'
import Footer from '@/components/Footer'
import { LayoutTransition } from '@/components/LayoutTransition'

// 样式文件
import './globals.css'

// Retain the complete page while ISR prepares its replacement in the background.
export const revalidate = 300

const fontSerif = localFont({
    src: [
        {
            path: './fonts/source-serif-4-latin-normal.woff2',
            weight: '200 900',
            style: 'normal',
        },
        {
            path: './fonts/source-serif-4-latin-italic.woff2',
            weight: '200 900',
            style: 'italic',
        },
    ],
    variable: '--font-serif',
    display: 'swap',
    adjustFontFallback: 'Times New Roman',
    fallback: ['Noto Serif SC', 'Times New Roman', 'SimSun', 'serif'],
})

const fontSans = localFont({
    src: [
        {
            path: './fonts/ibm-plex-sans-latin-normal.woff2',
            weight: '100 700',
            style: 'normal',
        },
        {
            path: './fonts/ibm-plex-sans-latin-italic.woff2',
            weight: '100 700',
            style: 'italic',
        },
    ],
    variable: '--font-sans',
    display: 'swap',
    adjustFontFallback: 'Arial',
    fallback: ['Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
})

const fontClass = config.font === 'serif' ? fontSerif.variable : fontSans.variable
const configuredRobots = buildRobotsMetadata(config.seo.indexing, advancedConfig.seo.robots)
const configuredThemeClass = config.appearance === 'auto' ? '' : config.appearance
const rssFeedUrl = buildSiteUrl(config.siteUrl, '/feed.xml')
const scrollbarWidthScript = `(()=>{const probe=document.createElement('div');probe.style.cssText='position:absolute;visibility:hidden;overflow:scroll;width:100px;height:100px';document.documentElement.appendChild(probe);document.documentElement.style.setProperty('--scrollbar-width',probe.offsetWidth-probe.clientWidth+'px');probe.remove()})()`

export const metadata: Metadata = {
    metadataBase: getMetadataBase(config.siteUrl),
    title: {
        default: config.title,
        template: `%s | ${config.title}`,
    },
    icons: buildFaviconMetadata(config.icons, config.appearance),
    ...(config.description ? { description: config.description } : {}),
    ...(config.seo.keywords.length ? { keywords: config.seo.keywords } : {}),
    ...(config.seo.googleSiteVerification
        ? {
              verification: {
                  google: config.seo.googleSiteVerification,
              },
          }
        : {}),
    robots: configuredRobots,
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang={config.locale} className={`${fontClass} ${configuredThemeClass}`} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: scrollbarWidthScript }} />
                <link rel="alternate" type="application/rss+xml" title={`${config.title} RSS`} href={rssFeedUrl} />
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
                <ThemeRuntime appearance={config.appearance}>
                    <ContextLayout>
                        <div className={`wrapper ${config.font === 'serif' ? 'font-serif' : 'font-sans'}`}>
                            <ArticleCover />
                            <Header />
                            <LayoutTransition
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }}
                                exit={{ opacity: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
                                className="grow self-stretch flex flex-col items-center lg:flex-row lg:items-stretch"
                            >
                                {children}
                            </LayoutTransition>
                            <Footer />
                        </div>
                    </ContextLayout>
                </ThemeRuntime>
            </body>
        </html>
    )
}
