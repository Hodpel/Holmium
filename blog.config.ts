import type { Config } from './lib/types'

const config: Config = {
    title: 'Holmium',
    author: {
        name: 'Holmium',
        url: 'https://holmium.vercel.app',
        email: 'holmium@hodpel.eu.org',
    },
    description: '在 Notion 中写作，让 Holmium 呈现。',
    siteUrl: 'https://holmium.vercel.app',
    locale: 'zh-CN' as const,
    timezone: 'Asia/Shanghai',
    appearance: 'auto',
    font: 'sans-serif',
    lightBackground: '#ffffff',
    darkBackground: '#2F3437',
    themeColor: '#6b69d6',
    icons: {
        favicon: '/favicon.png',
        faviconDark: '',
        headerLogo: '/header-logo.png',
        headerLogoDark: '',
    },
    path: '',
    since: 2026,
    postsPerPage: 7,
    sortByDate: false,
    autoCollapsedNavBar: false,
    navigation: [
        { label: '首页', icon: 'home', href: '/' },
        { label: '搜索', icon: 'search', href: '/search' },
    ],
    showArticleCover: true, // 是否展示文章顶部的 Notion 封面背景
    seo: {
        indexing: false,
        keywords: ['Holmium', 'Notion', 'Blog', 'Next.js'],
        googleSiteVerification: '',
    },
    analytics: {
        provider: '',
        ackeeConfig: {
            tracker: '',
            dataAckeeServer: '',
            domainId: '',
        },
        gaConfig: {
            measurementId: '', // e.g: G-XXXXXXXXXX
        },
    },
    comment: {
        provider: '',
        giscusConfig: {
            repo: '',
            repoId: '',
            category: '',
            categoryId: '',
        },
        artalkConfig: {
            server: '',
            site: '',
        },
    },
}

export default config
