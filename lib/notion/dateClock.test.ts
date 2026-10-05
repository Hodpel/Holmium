import assert from 'node:assert/strict'
import test from 'node:test'
import { createDateClock } from './dateClock.ts'

test('the date clock changes only when a relevant zone crosses midnight', () => {
    let now = new Date('2026-09-12T15:59:00Z')
    const read = createDateClock(['Asia/Shanghai', 'America/Los_Angeles'], () => now)
    const initial = read()
    now = new Date('2026-09-12T15:59:59Z')
    assert.equal(read(), initial)
    now = new Date('2026-09-12T16:00:00Z')
    assert.notEqual(read(), initial)
    const next = read()
    now = new Date('2026-09-13T07:00:00Z')
    assert.notEqual(read(), next)
})
