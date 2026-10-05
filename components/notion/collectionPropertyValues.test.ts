import assert from 'node:assert/strict'
import test from 'node:test'

import { renderToStaticMarkup } from 'react-dom/server'
import { CollectionCheckboxValue } from './collectionPropertyValues.ts'

test('renders an unchecked collection checkbox when Notion omits its value', () => {
    const element = CollectionCheckboxValue({
        data: undefined,
        schema: { name: '复选框' },
    })

    assert.match(renderToStaticMarkup(element), /notion-property-checkbox-unchecked/)
})

test('renders a checked collection checkbox for a Yes value', () => {
    const element = CollectionCheckboxValue({
        data: [['Yes']],
        schema: { name: '复选框' },
    })

    assert.match(renderToStaticMarkup(element), /notion-property-checkbox-checked/)
})
