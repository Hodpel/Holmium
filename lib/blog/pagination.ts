export interface PaginatedResult<T> {
    items: readonly T[]
    page: number
    hasPrevious: boolean
    hasNext: boolean
}

export function parsePageNumber(value: string): number | null {
    if (!/^[1-9]\d*$/.test(value)) return null

    const page = Number(value)
    return Number.isSafeInteger(page) ? page : null
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number): PaginatedResult<T> | null {
    if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
        throw new RangeError(`pageSize must be a positive safe integer; received ${pageSize}`)
    }
    if (!Number.isSafeInteger(page) || page < 1) return null

    const totalItems = items.length
    const pageCount = Math.max(1, Math.ceil(totalItems / pageSize))
    if (page > pageCount) return null

    const start = (page - 1) * pageSize
    return {
        items: items.slice(start, start + pageSize),
        page,
        hasPrevious: page > 1,
        hasNext: page < pageCount,
    }
}
