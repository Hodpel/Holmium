import assert from 'node:assert/strict'
import test from 'node:test'
import type { ExtendedRecordMap } from 'notion-types'
import { buildEquationHtmlMap } from './equation.ts'

function record(value: Record<string, unknown>) {
    return { role: 'reader', value }
}

test('pre-renders block and inline equations from a record map', () => {
    const recordMap = {
        block: {
            text: record({
                id: 'text',
                type: 'text',
                properties: { title: [['Inline: ', [['e', 'x^2']]]] },
            }),
            equation: record({
                id: 'equation',
                type: 'equation',
                properties: { title: [['\\int_0^1 x^2 dx']] },
            }),
        },
    } as unknown as ExtendedRecordMap

    const html = buildEquationHtmlMap(recordMap)

    assert.match(html.inline['x^2'], /class="katex"/)
    assert.doesNotMatch(html.inline['x^2'], /class="katex-display"/)
    assert.match(html.block['\\int_0^1 x^2 dx'], /class="katex-display"/)
})
