import assert from 'node:assert/strict'
import test from 'node:test'
import type { ExtendedRecordMap } from 'notion-types'
import { getBlockValue } from 'notion-utils'
import { normalizeUserMentions, userDisplayName } from './userMentions.ts'

test('modern names take priority, legacy names work, and missing names never expose email', () => {
    assert.equal(userDisplayName({ name: 'Example User', given_name: 'Legacy' }, 'zh-CN'), 'Example User')
    assert.equal(userDisplayName({ given_name: 'A', family_name: 'B' }, 'en-US'), 'A B')
    assert.equal(userDisplayName({ email: 'private@example.com' }, 'zh-CN'), '未知用户')
})
test('both user decoration forms render through one marker without mutating cached data', () => {
    const map = { notion_user: { person: { value: { id: 'person', name: 'Example User' } } }, block: {
        text: { value: { id: 'text', type: 'text', properties: { title: [['‣', [['u', 'person'], ['b']]], [' ', []], ['‣', [['‣', ['u', 'person']]]]] } } },
    } } as unknown as ExtendedRecordMap
    const result = normalizeUserMentions(map, 'zh-CN')
    assert.deepEqual(getBlockValue(result.block.text)!.properties!.title, [
        ['Example User', [['b'], ['a', 'holmium-person:person']]], [' ', []], ['Example User', [['a', 'holmium-person:person']]],
    ])
    assert.equal(getBlockValue(map.block.text)!.properties!.title[0][0], '‣')
    assert.equal(normalizeUserMentions(result, 'zh-CN'), result)
})

test('database people properties retain names without avatars and unknown users have a fallback', () => {
    const map = { notion_user: { person: { value: { id: 'person', name: 'Example User' } } }, block: {
        page: { value: { id: 'page', type: 'page', properties: {
            people: [['‣', [['u', 'person']]], [', '], ['‣', [['u', 'missing']]]],
            title: [['Unchanged']],
        } } },
    } } as unknown as ExtendedRecordMap
    const result = normalizeUserMentions(map, 'en-US')
    const properties = getBlockValue(result.block.page)!.properties!
    assert.deepEqual(properties.people, [
        ['Example User', [['a', 'holmium-person:person']]], [', '],
        ['Unknown user', [['a', 'holmium-person:missing']]],
    ])
    assert.equal(properties.title, getBlockValue(map.block.page)!.properties!.title)
})
