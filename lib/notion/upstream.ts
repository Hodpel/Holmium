export type BlogUpstreamErrorCode =
    | 'UPSTREAM_AUTH'
    | 'UPSTREAM_RATE_LIMIT'
    | 'UPSTREAM_TIMEOUT'
    | 'UPSTREAM_UNAVAILABLE'
    | 'PAGE_UNAVAILABLE'

export type NotionRequestOperation = 'blog-index' | 'blog-page' | 'blog-file'

export class BlogUpstreamError extends Error {
    readonly code: BlogUpstreamErrorCode
    readonly operation: NotionRequestOperation
    readonly status?: number

    constructor(
        code: BlogUpstreamErrorCode,
        operation: NotionRequestOperation,
        options: { cause?: unknown; status?: number } = {},
    ) {
        super(`Notion upstream ${code} while loading ${operation}`, { cause: options.cause })
        this.name = 'BlogUpstreamError'
        this.code = code
        this.operation = operation
        this.status = options.status
    }
}

const NOTION_REQUEST_BUDGET_MS = 40_000
const NOTION_RETRY_DELAYS_MS = [250, 750] as const
const RETRYABLE_STATUS_CODES = new Set([408, 429])
const NETWORK_ERROR_CODES = new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'ENETDOWN',
    'ENETUNREACH',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ETIMEDOUT',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_SOCKET',
])

function readProperty(value: unknown, property: string): unknown {
    return typeof value === 'object' && value !== null ? Reflect.get(value, property) : undefined
}

function readStatus(error: unknown): number | undefined {
    const status = readProperty(error, 'status') ?? readProperty(error, 'statusCode')
    if (typeof status === 'number') return status

    const cause = readProperty(error, 'cause')
    return cause === undefined || cause === error ? undefined : readStatus(cause)
}

function readErrorCode(error: unknown): string | undefined {
    const code = readProperty(error, 'code')
    if (typeof code === 'string') return code

    const cause = readProperty(error, 'cause')
    return cause === undefined || cause === error ? undefined : readErrorCode(cause)
}

function isNotionPageMissing(error: unknown): boolean {
    return error instanceof Error && /^Notion page not found\b/.test(error.message)
}

function isNetworkFailure(error: unknown): boolean {
    if (readProperty(error, 'name') === 'FetchError' && readStatus(error) === undefined) return true

    const code = readErrorCode(error)
    return code !== undefined && (NETWORK_ERROR_CODES.has(code) || code.startsWith('UND_ERR_'))
}

function isRetryable(error: unknown): boolean {
    const status = readStatus(error)
    if (status !== undefined) return RETRYABLE_STATUS_CODES.has(status) || status >= 500
    return isNetworkFailure(error)
}

function classifyNotionUpstreamError(
    error: unknown,
    operation: NotionRequestOperation,
    timedOut = false,
): BlogUpstreamError {
    if (error instanceof BlogUpstreamError) return error

    const status = readStatus(error)
    let code: BlogUpstreamErrorCode

    if (timedOut || status === 408) code = 'UPSTREAM_TIMEOUT'
    else if (status === 401 || status === 403) code = 'UPSTREAM_AUTH'
    else if (status === 404 || isNotionPageMissing(error)) code = 'PAGE_UNAVAILABLE'
    else if (status === 429) code = 'UPSTREAM_RATE_LIMIT'
    else code = 'UPSTREAM_UNAVAILABLE'

    return new BlogUpstreamError(code, operation, { cause: error, status })
}

function defaultSleep(milliseconds: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(signal.reason)
            return
        }

        const timer = setTimeout(finish, milliseconds)
        signal.addEventListener('abort', abort, { once: true })

        function finish() {
            signal.removeEventListener('abort', abort)
            resolve()
        }

        function abort() {
            clearTimeout(timer)
            reject(signal.reason)
        }
    })
}

export async function executeNotionRequest<T>(
    operation: NotionRequestOperation,
    request: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
    const startedAt = Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(new DOMException('Notion request budget exceeded', 'TimeoutError')), NOTION_REQUEST_BUDGET_MS)

    try {
        for (let attempt = 0; ; attempt += 1) {
            try {
                return await request(controller.signal)
            } catch (error) {
                const timedOut = controller.signal.aborted || Date.now() - startedAt >= NOTION_REQUEST_BUDGET_MS
                const retryDelay = NOTION_RETRY_DELAYS_MS[attempt]

                if (timedOut) throw classifyNotionUpstreamError(error, operation, true)
                if (retryDelay === undefined || !isRetryable(error)) {
                    throw classifyNotionUpstreamError(error, operation)
                }
                if (Date.now() - startedAt + retryDelay >= NOTION_REQUEST_BUDGET_MS) {
                    throw classifyNotionUpstreamError(error, operation)
                }

                try {
                    await defaultSleep(retryDelay, controller.signal)
                } catch (sleepError) {
                    throw classifyNotionUpstreamError(sleepError, operation, true)
                }
            }
        }
    } finally {
        clearTimeout(timeout)
    }
}
