import 'server-only'

export type ServerConfig = {
    /** Root Notion page or database ID used as the blog index. */
    notionPageId: string | undefined
    /** Optional token for a private Notion page or database. */
    notionAccessToken: string | undefined
    /** Host used by notion-client. Do not include a protocol or trailing slash. */
    notionHost: string
}

function normalizeNotionHost(value: string | undefined): string {
    return value?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '') || 'www.notion.so'
}

/**
 * Server-only blog configuration.
 *
 * Configure these values in `.env.local` for local development and in the
 * deployment platform's environment variables for production. Keep secrets
 * out of `blog.config.ts`, because that file is also imported by Client
 * Components.
 */
const serverConfig = {
    notionPageId: process.env.NOTION_PAGE_ID?.trim() || undefined,
    notionAccessToken: process.env.NOTION_ACCESS_TOKEN?.trim() || undefined,
    notionHost: normalizeNotionHost(process.env.NOTION_HOST ?? process.env.NEXT_PUBLIC_NOTION_HOST),
} satisfies ServerConfig

export default serverConfig
