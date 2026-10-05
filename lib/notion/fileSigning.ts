import 'server-only'

import notion from './notionAPI'
import { createFileUrlResolver } from './fileResources'
import { executeNotionRequest } from './upstream'

export const resolveNotionFileUrl = createFileUrlResolver((blockId, source) =>
    executeNotionRequest('blog-file', async signal => {
        const response = await notion.getSignedFileUrls(
            [{ permissionRecord: { table: 'block', id: blockId }, url: source }],
            { retry: false, signal },
        )
        return response.signedUrls?.[0] ?? undefined
    }),
)
