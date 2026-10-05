import type { NextConfig } from 'next'

const { NEXT_PUBLIC_NOTION_HOST } = process.env
const notionOrigin = new URL(`https://${NEXT_PUBLIC_NOTION_HOST || 'www.notion.so'}`)

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
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

export default nextConfig
