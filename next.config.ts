import type { NextConfig } from 'next'
const { NEXT_PUBLIC_NOTION_HOST } = process.env

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: NEXT_PUBLIC_NOTION_HOST || 'www.notion.so',
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
                hostname: 'gravatar.com',
                pathname: '/avatar/**', // 允许访问 gravatar.com/avatar/ 下的所有图片
            },
        ],
    },
}

export default nextConfig
