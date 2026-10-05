import assert from 'node:assert/strict'
import test from 'node:test'
import type { ExtendedRecordMap } from 'notion-types'
import { extractSummary } from './summary.ts'

const map = { block: { repo: { value: { value: { id: 'repo', type: 'external_object_instance', format: {
    original_url: 'https://github.com/example/project',
    attributes: [{ id: 'title', values: ['Example project'] }],
} }, role: 'reader' } } } } as unknown as ExtendedRecordMap

test('summary resolves external object and web mentions without making ordinary links special', () => {
    const result = extractSummary([
        ['前 '], ['‣', [['eoi', 'repo']]], [' | '],
        ['‣', [['lm', { title: 'Example', href: 'https://example.com', icon_url: 'https://example.com/icon.png' }]]],
        [' 普通链接', [['a', 'https://example.com']]],
    ], map)
    assert.equal(result.summary, '前 Example project | Example 普通链接')
    assert.deepEqual(result.summaryParts, [
        { type: 'text', text: '前 ' },
        { type: 'mention', text: 'Example project', icon: { type: 'github' } },
        { type: 'text', text: ' | ' },
        { type: 'mention', text: 'Example', icon: { type: 'image', src: 'https://example.com/icon.png' } },
        { type: 'text', text: ' 普通链接' },
    ])
})

test('missing and malformed mentions have readable fallbacks and unsafe icons are discarded', () => {
    const result = extractSummary([
        ['‣', [['eoi', 'missing']]], [' '],
        ['‣', [['lm', { href: 'https://example.com/item', icon_url: 'javascript:alert(1)' }]]],
    ], map)
    assert.equal(result.summary, '链接 https://example.com/item')
    assert.deepEqual(result.summaryParts?.filter(p => p.type === 'mention').map(p => p.icon), [{ type: 'link' }, { type: 'link' }])
})

test('page mentions retain names and emoji or image icons with a document fallback', () => {
    const pages = { block: {
        p: { value: { id: 'p', type: 'page', properties: { title: [['文章']] }, format: { page_icon: '🥳' } } },
        q: { value: { id: 'q', type: 'page', properties: { title: [['图片页']] }, format: { page_icon: '/icons/document_purple.svg' } } },
        db: { value: { id: 'db', type: 'collection_view_page', collection_id: 'c' } },
    }, collection: { c: { value: { id: 'c', name: [['数据库']] } } } } as unknown as ExtendedRecordMap
    const result = extractSummary(['p', 'q', 'db', 'missing'].map(id => ['‣', [['p', id]]]), pages)
    assert.equal(result.summary, '文章图片页数据库页面')
    assert.deepEqual(result.summaryParts, [
        { type: 'mention', text: '文章', icon: { type: 'emoji', text: '🥳' } },
        { type: 'mention', text: '图片页', icon: { type: 'image', src: 'https://www.notion.so/icons/document_purple.svg', fallback: 'page' } },
        { type: 'mention', text: '数据库', icon: { type: 'page' } },
        { type: 'mention', text: '页面', icon: { type: 'page' } },
    ])
})

test('person mentions preserve modern names and safe avatars without exposing email', () => {
    const people = { ...map, notion_user: { person: { value: { id: 'person', name: 'Example User', profile_photo: 'https://example.com/avatar.png' } } } } as unknown as ExtendedRecordMap
    assert.deepEqual(extractSummary([['‣', [['u', 'person']]], ['‣', [['‣', ['u', 'missing']]]]], people), {
        summary: 'Example User未知用户', summaryParts: [
            { type: 'person', text: 'Example User', avatar: 'https://example.com/avatar.png' },
            { type: 'person', text: '未知用户', avatar: undefined },
        ],
    })
})

test('summary dates keep deterministic cache text and metadata for the body date clock', () => {
    assert.deepEqual(extractSummary([['‣', [['d', { type: 'date', start_date: '2026-09-14', date_format: 'relative' }]]]], map), {
        summary: '2026年9月14日', summaryParts: [{ type: 'date', text: '2026年9月14日', value: { type: 'date', start_date: '2026-09-14', date_format: 'relative' } }],
    })
})

test('equations preserve raw LaTeX as ordinary text, including beside mentions', () => {
    const formula = String.raw`\frac{a}{b} + E=mc^2`
    assert.deepEqual(extractSummary([['前 '], ['⁍', [['e', formula]]], [' 后']], map), { summary: `前 ${formula} 后` })
    const result = extractSummary([['‣', [['eoi', 'repo']]], [' '], ['⁍', [['e', 'E=mc^2']]]], map)
    assert.equal(result.summary, 'Example project E=mc^2')
    assert.deepEqual(result.summaryParts?.at(-1), { type: 'text', text: ' E=mc^2' })
    assert.deepEqual(extractSummary([['⁍', [['e', null]]], ['保留']], map), { summary: '保留' })
})

test('plain summaries retain whitespace and formatting text; other special types stay out of scope', () => {
    assert.deepEqual(extractSummary([['文本\n  code']], map), { summary: '文本\n  code' })
    assert.deepEqual(extractSummary([], map), { summary: null })
})

test('summary preserves semantic text marks and code but discards author colors', () => {
    const result = extractSummary([
        ['强调', [['b'], ['i'], ['_',], ['s'], ['h', 'purple_background']]],
        ['code', [['c'], ['h', 'red']]], ['普通', [['h', 'blue']]], ['文字'],
    ], map)
    assert.equal(result.summary, '强调code普通文字')
    assert.deepEqual(result.summaryParts, [
        { type: 'text', text: '强调', marks: ['b', 'i', '_', 's'] },
        { type: 'text', text: 'code', marks: ['c'] },
        { type: 'text', text: '普通文字' },
    ])
})
