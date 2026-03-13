type HexColor = `#${string}`

export interface Config {
    /**
     * Blog title
     * @example 'Holmium'
     */
    title: string

    /**
     * Author information
     */
    author: {
        /**
         * Author name
         * @example 'Hodpel'
         */
        name: string
        /**
         * Personal website URL
         * @example 'https://i.google.com'
         */
        url: string
        /**
         * Contact email
         * @example 'i@google.com'
         */
        email: string
    }

    /**
     * Blog description
     * @example 'Just A Blog'
     */
    description: string

    /**
     * Locale setting
     * @example 'zh-CN', 'en-US'
     */
    locale: 'zh-CN' | 'zh-HK' | 'en-US' | 'zh-TW' | 'ja-JP' | 'es-ES' | string

    /**
     * Timezone
     * @default 'Asia/Shanghai'
     * @see https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
     */
    timezone: string

    /**
     * Appearance mode
     * @default 'auto'
     * - auto: Follow system preference
     * - light: Light mode
     * - dark: Dark mode
     */
    appearance: 'auto' | 'light' | 'dark'

    /**
     * Font type
     * @default 'sans-serif'
     */
    font: 'sans-serif' | 'serif'

    /**
     * Light mode background color
     * @default '#ffffff'
     * @format hex color
     */
    lightBackground: HexColor

    /**
     * Dark mode background color
     * @default '#2F3437'
     * @format hex color
     */
    darkBackground: HexColor

    /**
     * Theme color
     * @default '#6b69d6'
     * @format hex color
     */
    themeColor: HexColor

    /**
     * Deployment path
     * @description Fill this if deploying in a subfolder
     * @default ''
     */
    path: string

    /**
     * Blog founding year
     * @description Leave empty to use current year
     */
    since?: number

    /**
     * Posts per page
     * @default 7
     */
    postsPerPage: number

    /**
     * Sort posts by date
     * @default false
     */
    sortByDate: boolean

    /**
     * Show about page
     * @default true
     */
    showAbout: boolean

    /**
     * Show archive page
     * @default true
     */
    showArchive: boolean

    /**
     * Auto collapse navigation bar
     * @default false
     */
    autoCollapsedNavBar: boolean

    /**
     * OG image path
     * @example 'https://og-image-craigary.vercel.app'
     */
    ogImage: string

    /**
     * Social links
     */
    links: {
        /** Twitter username or URL */
        twitter: string
        /** GitHub username or URL */
        github: string
        /** Documentation link */
        docs: string
    }

    /**
     * SEO configuration
     */
    seo: {
        /** SEO keywords */
        keywords: string[]
        /**
         * Google site verification code
         * @description Remove the value or replace it with your own google site verification code
         */
        googleSiteVerification: string
    }

    /**
     * Notion page ID
     * @important DO NOT CHANGE THIS UNLESS YOU WANT YOUR PAGE ID EXPOSED
     */
    notionPageId: string

    /**
     * Notion access token
     * @description Useful if you prefer not to make your database public
     */
    notionAccessToken?: string

    /**
     * Analytics configuration
     */
    analytics: {
        /**
         * Analytics provider
         * - '': Disabled
         * - 'ga': Google Analytics
         * - 'ackee': Ackee
         */
        provider: '' | 'ga' | 'ackee'

        /** Ackee configuration */
        ackeeConfig: {
            /**
             * Ackee tracker URL
             * @example 'https://ackee.craigary.net/tracker.js'
             */
            tracker: string
            /**
             * Ackee server URL
             * @example 'https://ackee.craigary.net',
             * @important Don't end with a slash
             */
            dataAckeeServer: string
            /**
             * Domain ID
             * @example '0e2257a8-54d4-4847-91a1-0311ea48cc7b'
             */
            domainId: string
        }

        /** Google Analytics configuration */
        gaConfig: {
            /**
             * GA measurement ID
             * @example 'G-XXXXXXXXXX'
             */
            measurementId: string
        }
    }

    /**
     * Comment plugin configuration
     */
    comment: {
        /**
         * Comment provider
         * - '': Disabled
         * - 'gitalk': Gitalk
         * - 'utterances': Utterances
         * - 'cusdis': Cusdis
         */
        provider: '' | 'gitalk' | 'utterances' | 'cusdis'

        /** Gitalk configuration */
        gitalkConfig: {
            /** Repository to store comments */
            repo: string
            /** GitHub repository owner */
            owner: string
            /** GitHub admin users */
            admin: string[]
            /** GitHub OAuth client ID */
            clientID: string
            /** GitHub OAuth client secret */
            clientSecret: string
            /** Distraction free mode */
            distractionFreeMode: boolean
        }

        /** Utterances configuration */
        utterancesConfig: {
            /** GitHub repository */
            repo: string
        }

        /** Cusdis configuration */
        cusdisConfig: {
            /** data-app-id */
            appId: string
            /** data-host, change this if using self-hosted version
             * @default 'https://cusdis.com'
             */
            host: string
            /** Script source, change this if using self-hosted version
             * @default 'https://cusdis.com/js/cusdis.es.js'
             */
            scriptSrc: string
        }
    }

    /**
     * Whether in production environment
     * @description Automatically determined based on Vercel environment variables
     */
    isProd: boolean
}

export interface PageProperties {
    id: string
    title?: string
    slug?: string
    type?: string
    tags?: string[]
    date: Date
    summary?: string
    status?: string
    format: {
        [key: string]: any
    }
}

export type PostsList = PageProperties[]
