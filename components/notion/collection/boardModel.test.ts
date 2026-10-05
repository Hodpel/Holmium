import assert from 'node:assert/strict'
import test from 'node:test'
import type { Collection, CollectionQueryResult, CollectionView, ExtendedRecordMap } from 'notion-types'

import { buildBoardModel } from './boardModel.ts'

function record(value: Record<string, unknown>) {
    return { role: 'reader', value }
}

test('groups current Notion status boards by their option names', () => {
    const statusProperty = 'status'
    const options = [
        { id: 'not-started', value: 'Not started' },
        { id: 'in-progress', color: 'blue', value: 'In progress' },
        { id: 'done', color: 'green', value: 'Done' },
    ]
    const collection = {
        id: 'collection',
        schema: {
            [statusProperty]: { defaultOption: 'Not started', options, type: 'status' },
            title: { name: 'Name', type: 'title' },
        },
    } as unknown as Collection
    const collectionView = {
        id: 'view',
        type: 'board',
        format: {
            board_columns_by: { property: statusProperty },
            board_columns: options.map(({ value }) => ({
                property: statusProperty,
                value: { type: 'status', value: { option: value, type: 'by_option' } },
            })),
        },
    } as unknown as CollectionView
    const blockIds = ['todo-a', 'todo-b', 'doing', 'done']
    const recordMap = {
        block: {
            'todo-a': record({ id: 'todo-a', properties: { title: [['A']] }, type: 'page' }),
            'todo-b': record({ id: 'todo-b', properties: { title: [['B']] }, type: 'page' }),
            doing: record({
                id: 'doing',
                properties: { [statusProperty]: [['In progress']], title: [['C']] },
                type: 'page',
            }),
            done: record({
                id: 'done',
                properties: { [statusProperty]: [['Done']], title: [['D']] },
                type: 'page',
            }),
        },
    } as unknown as ExtendedRecordMap
    const collectionData = { collection_group_results: { blockIds } } as unknown as CollectionQueryResult

    const model = buildBoardModel({ collection, collectionData, collectionView, recordMap })

    assert.deepEqual(
        model?.columns.map((column) => [column.name, column.cards.length]),
        [
            ['Not started', 2],
            ['In progress', 1],
            ['Done', 1],
        ],
    )
})

test('preserves structured visible properties for board card rendering', () => {
    const collection = {
        id: 'collection',
        schema: {
            done: { name: 'Done', type: 'checkbox' },
            unchecked: { name: 'Unchecked', type: 'checkbox' },
            assignee: { name: 'Assign', type: 'person' },
            empty: { name: 'Empty', type: 'text' },
            zero: { name: 'Zero', type: 'number' },
            hidden: { name: 'Hidden', type: 'text' },
            status: {
                options: [{ color: 'blue', id: 'in-progress', value: 'In progress' }],
                type: 'status',
            },
            tags: {
                name: 'Tags',
                options: [
                    { color: 'pink', id: 'one', value: 'One' },
                    { color: 'purple', id: 'two', value: 'Two' },
                ],
                type: 'multi_select',
            },
            title: { name: 'Name', type: 'title' },
        },
    } as unknown as Collection
    const collectionView = {
        id: 'view',
        type: 'board',
        format: {
            board_columns_by: { property: 'status' },
            board_properties: [
                { property: 'title', visible: true },
                { property: 'tags', visible: true },
                { property: 'done', visible: true },
                { property: 'unchecked', visible: true },
                { property: 'assignee', visible: true },
                { property: 'empty', visible: true },
                { property: 'zero', visible: true },
                { property: 'hidden', visible: false },
            ],
        },
    } as unknown as CollectionView
    const recordMap = {
        block: {
            card: record({
                id: 'card',
                properties: {
                    done: [['Yes']],
                    empty: [['']],
                    zero: [['0']],
                    hidden: [['secret']],
                    status: [['In progress']],
                    tags: [['One,Two']],
                    title: [['Card']],
                },
                type: 'page',
            }),
        },
    } as unknown as ExtendedRecordMap
    const collectionData = { blockIds: ['card'] } as unknown as CollectionQueryResult

    const model = buildBoardModel({ collection, collectionData, collectionView, recordMap })
    const card = model?.columns[0]?.cards[0] as
        | {
              properties?: Array<{ data: unknown; id: string; schema: { type?: string } }>
          }
        | undefined

    assert.deepEqual(
        card?.properties?.map(({ data, id, schema }) => ({ data, id, type: schema.type })),
        [
            { data: [['One,Two']], id: 'tags', type: 'multi_select' },
            { data: [['Yes']], id: 'done', type: 'checkbox' },
            { data: undefined, id: 'unchecked', type: 'checkbox' },
            { data: [['0']], id: 'zero', type: 'number' },
        ],
    )
})
