import serverConfig from '@/config/blog.server'
import { NotionAPI } from 'notion-client'

const notion = new NotionAPI({
    apiBaseUrl: `https://${serverConfig.notionHost}/api/v3`,
    authToken: serverConfig.notionAccessToken,
})

export default notion
