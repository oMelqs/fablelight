import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluate } from '../src/shared/dice'
import type { RollRule } from '../src/shared/types'

const pool: RollRule = { mode: 'pool', maxRolled: 4, maxSummed: 3, critical: { pairMin: 6 }, fumble: 'allOnes' }
const d = (...v: number[]) => v.map((value) => ({ sides: 12, value }))

test('pool: 6-6-7 crit', () => {
  const r = evaluate(pool, d(6, 6, 7))
  assert.equal(r.critical, true)
  assert.equal(r.sum, 19)
  assert.equal(r.high, 7)
  assert.equal(r.low, 6)
})
test('pool: 5-5-8 not crit', () => assert.equal(evaluate(pool, d(5, 5, 8)).critical, false))
test('pool: 4-4-4 not crit', () => assert.equal(evaluate(pool, d(4, 4, 4)).critical, false))
test('pool: 1-1-1 fumble', () => assert.equal(evaluate(pool, d(1, 1, 1)).fumble, true))
test('pool: 1-1-3 not fumble', () => assert.equal(evaluate(pool, d(1, 1, 3)).fumble, false))
test('pool: 4 dice keep 3 highest, discarded excluded', () => {
  const r = evaluate(pool, d(2, 9, 5, 7))
  assert.deepEqual(r.kept.map((x) => x.value), [9, 7, 5])
  assert.deepEqual(r.discarded.map((x) => x.value), [2])
  assert.equal(r.sum, 21)
  assert.equal(r.low, 5) // RB ignores the discarded 2
  assert.equal(r.high, 9)
})
test('pool: DT success/failure with margin', () => {
  const ok = evaluate(pool, d(3, 4, 5), { dt: 12, modifier: 1 })
  assert.equal(ok.success, true)
  assert.equal(ok.margin, 1)
  const ko = evaluate(pool, d(3, 4, 5), { dt: 13 })
  assert.equal(ko.success, false)
  assert.equal(ko.margin, -1)
})
test('d20 nat 20 / nat 1', () => {
  const rule: RollRule = { mode: 'd20' }
  const hi = evaluate(rule, [{ sides: 20, value: 20 }], { dt: 15, modifier: 2 })
  assert.equal(hi.critical, true)
  assert.equal(hi.total, 22)
  assert.equal(hi.success, true)
  assert.equal(evaluate(rule, [{ sides: 20, value: 1 }]).fumble, true)
})
test('d20 advantage keeps highest', () => {
  const r = evaluate({ mode: 'd20' }, [{ sides: 20, value: 4 }, { sides: 20, value: 15 }], { advantage: 'adv' })
  assert.equal(r.total, 15)
})
test('d100 crit / fumble', () => {
  const rule: RollRule = { mode: 'd100' }
  const dd = (value: number) => [{ sides: 100, value }]
  assert.equal(evaluate(rule, dd(10), { dt: 50 }).critical, true)
  assert.equal(evaluate(rule, dd(11), { dt: 50 }).critical, false)
  assert.equal(evaluate(rule, dd(40), { dt: 50 }).success, true)
  assert.equal(evaluate(rule, dd(96), { dt: 99 }).fumble, true)
})
