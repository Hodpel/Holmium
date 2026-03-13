import { NotionAPI } from 'notion-client'

const { NOTION_ACCESS_TOKEN, NEXT_PUBLIC_NOTION_HOST } = process.env

const notion = new NotionAPI({ apiBaseUrl: `https://${NEXT_PUBLIC_NOTION_HOST || 'www.notion.so'}/api/v3`, authToken: NOTION_ACCESS_TOKEN })

export default notion
