import katex from 'katex'
import type { ExtendedRecordMap } from 'notion-types'
import { getBlockTitle, getBlockValue } from 'notion-utils'

export type EquationHtmlMap = {
    inline: Record<string, string>
    block: Record<string, string>
}

function renderEquationHtml(math: string, inline: boolean): string {
    return katex.renderToString(math, {
        displayMode: !inline,
        strict: false,
        throwOnError: false,
    })
}

function collectInlineEquations(value: unknown, equations: Set<string>): void {
    if (!Array.isArray(value)) return

    if (value.length === 2 && value[0] === 'e' && typeof value[1] === 'string') {
        equations.add(value[1])
        return
    }

    for (const child of value) collectInlineEquations(child, equations)
}

export function buildEquationHtmlMap(recordMap: ExtendedRecordMap): EquationHtmlMap {
    const inline = new Set<string>()
    const block = new Set<string>()

    for (const record of Object.values(recordMap.block)) {
        const value = getBlockValue(record)
        if (!value) continue

        for (const property of Object.values(value.properties || {})) {
            collectInlineEquations(property, inline)
        }

        if (value.type === 'equation') {
            const math = getBlockTitle(value, recordMap)
            if (math) block.add(math)
        }
    }

    return {
        inline: Object.fromEntries(Array.from(inline, (math) => [math, renderEquationHtml(math, true)])),
        block: Object.fromEntries(Array.from(block, (math) => [math, renderEquationHtml(math, false)])),
    }
}
