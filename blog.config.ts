import { Config } from '@/lib/types'

export default {
    title: 'Holmium',
    author: {
        name: 'Dominic Hodpel',
        url: 'https://hodpel.eu.org',
        email: 'i@hodpel.eu.org',
    },
    description: '',
    locale: 'zh-CN' as const,
    timezone: 'Asia/Shanghai',
    appearance: 'auto',
    font: 'sans-serif',
    lightBackground: '#ffffff',
    darkBackground: '#2F3437',
    themeColor: '#6b69d6',
    path: '',
    since: 2022,
    postsPerPage: 7,
    sortByDate: false,
    showAbout: true,
    showArchive: true,
    autoCollapsedNavBar: false,
    ogImage: '/og-image.jpg',
    links: {
        twitter: '',
        github: '',
        docs: '',
    },
    seo: {
        keywords: ['Blog', 'Website', 'Notion'],
        googleSiteVerification: '',
    },
    notionPageId: process.env.NOTION_PAGE_ID!,
    notionAccessToken: process.env.NOTION_ACCESS_TOKEN,
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
        gitalkConfig: {
            repo: '',
            owner: '',
            admin: [],
            clientID: '',
            clientSecret: '',
            distractionFreeMode: false,
        },
        utterancesConfig: {
            repo: '',
        },
        cusdisConfig: {
            appId: '',
            host: 'https://cusdis.com',
            scriptSrc: 'https://cusdis.com/js/cusdis.es.js',
        },
    },
    isProd: process.env.VERCEL_ENV === 'production',
} as Config
