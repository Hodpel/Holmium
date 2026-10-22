import type { NextConfig } from 'next'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'

const { NEXT_PUBLIC_NOTION_HOST } = process.env
const notionOrigin = new URL(`https://${NEXT_PUBLIC_NOTION_HOST || 'www.notion.so'}`)

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'app.notion.com', pathname: '/image/**' },
            {
                protocol: 'https',
                hostname: notionOrigin.hostname,
                ...(notionOrigin.port ? { port: notionOrigin.port } : {}),
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'www.notion.so',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'notion.so',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'cravatar.cn',
                pathname: '/avatar/**',
            },
        ],
    },
}

export default function config(phase: string): NextConfig {
    if (phase === PHASE_PRODUCTION_BUILD) {
        console.info(`[build] Node.js ${process.version}`)
    }
    return nextConfig
}
