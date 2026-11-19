import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  addTab, closeGroup, findByKey, findTab, groups, moveTab, newGroup, newTab, normalize, openBeside, removeTab,
  resizeSizes, splitGroup, tabKey, PRESETS, isLayout, type Node, type SplitNode,
} from '../src/web/workspace/layout'

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)

test('presets are valid layouts', () => {
  for (const mk of Object.values(PRESETS)) assert.ok(isLayout(mk()))
})

test('tab keys: singletons by type, editors by type+ref', () => {
  assert.equal(tabKey({ type: 'log' }), 'log')
  assert.equal(tabKey({ type: 'note', ref: 3 }), 'note:3')
})

test('splitGroup moves the active tab into a new group to the right', () => {
  const a = newTab('log'), b = newTab('calc')
  const g = newGroup([a, b])
  const out = splitGroup(g, g.id, 'row') as SplitNode
  assert.equal(out.kind, 'split'); assert.equal(out.dir, 'row')
  assert.deepEqual(out.sizes, [0.5, 0.5])
  assert.equal((out.children[0] as any).tabs.length, 1)
  assert.equal((out.children[1] as any).tabs[0].id, a.id)
  // a one-tab group cannot split
  const solo = newGroup([newTab('log')])
  assert.equal(splitGroup(solo, solo.id, 'row'), solo)
})

test('moveTab center joins the target group; empty source is removed and the split collapses', () => {
  const a = newTab('log'), b = newTab('calc')
  const g1 = newGroup([a]), g2 = newGroup([b])
  const root: Node = { kind: 'split', dir: 'row', sizes: [0.5, 0.5], children: [g1, g2] }
  const out = moveTab(root, a.id, g2.id, 'center')
  assert.equal(out.kind, 'group')
  assert.deepEqual((out as any).tabs.map((t: any) => t.type), ['calc', 'log'])
  assert.equal((out as any).active, a.id)
})

test('moveTab edge splits the target and flattens a same-direction parent', () => {
  const a = newTab('log'), b = newTab('calc'), c = newTab('audio')
  const g1 = newGroup([a, c]), g2 = newGroup([b])
  const root: Node = { kind: 'split', dir: 'row', sizes: [0.6, 0.4], children: [g1, g2] }
  const out = moveTab(root, c.id, g2.id, 'right') as SplitNode
  assert.equal(out.kind, 'split'); assert.equal(out.children.length, 3)
  near(sum(out.sizes), 1)
  near(out.sizes[0], 0.6); near(out.sizes[1], 0.2); near(out.sizes[2], 0.2)
  assert.deepEqual(groups(out).map((x) => x.tabs.map((t) => t.type)), [['log'], ['calc'], ['audio']])
  // dropping on a perpendicular edge nests
  const col = moveTab(root, c.id, g2.id, 'bottom') as SplitNode
  assert.equal(col.children.length, 2)
  assert.equal((col.children[1] as SplitNode).dir, 'col')
})

test('moveTab onto the only tab of its own group via an edge is a no-op', () => {
  const a = newTab('log'); const g1 = newGroup([a])
  const root: Node = { kind: 'split', dir: 'row', sizes: [0.5, 0.5], children: [g1, newGroup([newTab('calc')])] }
  assert.equal(moveTab(root, a.id, g1.id, 'left'), root)
})

test('moveTab reorders inside the same group by index', () => {
  const a = newTab('log'), b = newTab('calc'), c = newTab('audio')
  const g = newGroup([a, b, c])
  const out = moveTab(g, a.id, g.id, 'center', 3) as any
  assert.deepEqual(out.tabs.map((t: any) => t.type), ['calc', 'audio', 'log'])
})

test('removeTab: last tab removes the group, split collapses, root never empties', () => {
  const a = newTab('log'), b = newTab('calc')
  const root: Node = { kind: 'split', dir: 'col', sizes: [0.7, 0.3], children: [newGroup([a]), newGroup([b])] }
  const out = removeTab(root, a.id)
  assert.equal(out.kind, 'group'); assert.equal((out as any).tabs[0].id, b.id)
  const empty = removeTab(out, b.id)
  assert.equal(empty.kind, 'group'); assert.equal((empty as any).tabs.length, 0)
})

test('active tab falls to a neighbour on close', () => {
  const a = newTab('log'), b = newTab('calc'), c = newTab('audio')
  const g = { ...newGroup([a, b, c]), active: b.id }
  const out = removeTab(g, b.id) as any
  assert.equal(out.active, c.id)
})

test('openBeside and closeGroup', () => {
  const g = newGroup([newTab('log')])
  const t = newTab('note', 4)
  const out = openBeside(g, g.id, t) as SplitNode
  assert.equal(out.children.length, 2)
  assert.ok(findByKey(out, 'note:4'))
  const gid = findTab(out, t.id)!.group.id
  assert.equal(closeGroup(out, gid).kind, 'group')
})

test('normalize renormalizes sizes after pruning', () => {
  const root: Node = { kind: 'split', dir: 'row', sizes: [0.2, 0.3, 0.5], children: [newGroup([newTab('log')]), newGroup(), newGroup([newTab('calc')])] }
  const out = normalize(root) as SplitNode
  assert.equal(out.children.length, 2)
  near(out.sizes[0], 0.2 / 0.7); near(sum(out.sizes), 1)
})

test('resizeSizes respects the minimum and conserves the pair', () => {
  const r = resizeSizes([0.5, 0.3, 0.2], 0, 0.1, 0.1)
  near(r[0], 0.6); near(r[1], 0.2); near(r[2], 0.2)
  const clamp = resizeSizes([0.5, 0.5], 0, 0.9, 0.1)
  near(clamp[0], 0.9); near(clamp[1], 0.1)
  const neg = resizeSizes([0.5, 0.5], 0, -0.9, 0.1)
  near(neg[0], 0.1)
})

test('addTab focuses the new tab', () => {
  const g = newGroup([newTab('log')]); const t = newTab('calc')
  const out = addTab(g, g.id, t) as any
  assert.equal(out.active, t.id)
})
