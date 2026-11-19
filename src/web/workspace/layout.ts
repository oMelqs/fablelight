// Pure layout-tree operations (no DOM, no React). The tree is immutable: every op returns a new tree.

export type PanelType =
  | 'log' | 'scene' | 'combat' | 'calc' | 'books' | 'audio' | 'party'
  | 'scene-edit' | 'encounter' | 'character' | 'creature' | 'note' | 'session' | 'book' | 'system'
  | 'library-systems' | 'library-bestiary' | 'library-books' | 'library-audio'

export type TabRef = { id: string; type: PanelType; ref?: number | string; title?: string }
export type GroupNode = { kind: 'group'; id: string; tabs: TabRef[]; active: string | null }
export type SplitNode = { kind: 'split'; dir: 'row' | 'col'; sizes: number[]; children: Node[] }
export type Node = SplitNode | GroupNode
export type Zone = 'center' | 'left' | 'right' | 'top' | 'bottom'

const EDITORS: PanelType[] = ['scene-edit', 'encounter', 'character', 'creature', 'note', 'session', 'book', 'system']
/** Singletons (one open at most) are keyed by type; editors by type + ref. */
export const isEditor = (t: PanelType) => EDITORS.includes(t)
export const tabKey = (t: { type: PanelType; ref?: number | string }) => (isEditor(t.type) ? `${t.type}:${t.ref ?? ''}` : t.type)

let seq = 0
export const uid = (p = 'n') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`
export const newTab = (type: PanelType, ref?: number | string, title?: string): TabRef => ({ id: uid('t'), type, ...(ref !== undefined ? { ref } : {}), ...(title ? { title } : {}) })
export const newGroup = (tabs: TabRef[] = []): GroupNode => ({ kind: 'group', id: uid('g'), tabs, active: tabs[0]?.id ?? null })

export function groups(n: Node): GroupNode[] {
  return n.kind === 'group' ? [n] : n.children.flatMap(groups)
}
export const findGroup = (n: Node, id: string) => groups(n).find((g) => g.id === id) ?? null
export function findTab(n: Node, tabId: string) {
  for (const group of groups(n)) { const tab = group.tabs.find((t) => t.id === tabId); if (tab) return { group, tab } }
  return null
}
export function findByKey(n: Node, key: string) {
  for (const group of groups(n)) { const tab = group.tabs.find((t) => tabKey(t) === key); if (tab) return { group, tab } }
  return null
}

const norm = (sizes: number[]) => {
  const s = sizes.reduce((a, b) => a + b, 0) || 1
  return sizes.map((x) => x / s)
}

/** Drops empty groups, collapses 1-child splits, flattens same-direction nesting. Returns null when nothing is left. */
export function normalize(n: Node): Node | null {
  if (n.kind === 'group') return n.tabs.length ? n : null
  const kids: { node: Node; size: number }[] = []
  n.children.forEach((c, i) => {
    const m = normalize(c)
    if (!m) return
    const size = n.sizes[i] ?? 1 / n.children.length
    if (m.kind === 'split' && m.dir === n.dir) m.children.forEach((g, j) => kids.push({ node: g, size: size * m.sizes[j] }))
    else kids.push({ node: m, size })
  })
  if (!kids.length) return null
  if (kids.length === 1) return kids[0].node
  return { kind: 'split', dir: n.dir, sizes: norm(kids.map((k) => k.size)), children: kids.map((k) => k.node) }
}
/** normalize, but never returns an empty tree: a lone empty group stays as a drop target. */
const fix = (n: Node): Node => normalize(n) ?? newGroup()

function mapGroup(n: Node, id: string, fn: (g: GroupNode) => Node): Node {
  if (n.kind === 'group') return n.id === id ? fn(n) : n
  return { ...n, children: n.children.map((c) => mapGroup(c, id, fn)) }
}

export function setActive(root: Node, gid: string, tabId: string): Node {
  return mapGroup(root, gid, (g) => (g.tabs.some((t) => t.id === tabId) ? { ...g, active: tabId } : g))
}

export function addTab(root: Node, gid: string, tab: TabRef, index?: number): Node {
  return mapGroup(root, gid, (g) => {
    const tabs = [...g.tabs]
    tabs.splice(index === undefined ? tabs.length : Math.max(0, Math.min(index, tabs.length)), 0, tab)
    return { ...g, tabs, active: tab.id }
  })
}

function dropTab(root: Node, tabId: string): Node {
  const f = findTab(root, tabId)
  if (!f) return root
  return mapGroup(root, f.group.id, (g) => {
    const i = g.tabs.findIndex((t) => t.id === tabId)
    const tabs = g.tabs.filter((t) => t.id !== tabId)
    const active = g.active === tabId ? (tabs[Math.min(i, tabs.length - 1)]?.id ?? null) : g.active
    return { ...g, tabs, active }
  })
}

export const removeTab = (root: Node, tabId: string): Node => fix(dropTab(root, tabId))

const splitAround = (g: GroupNode, zone: Exclude<Zone, 'center'>, fresh: GroupNode): SplitNode => {
  const first = zone === 'left' || zone === 'top'
  return { kind: 'split', dir: zone === 'left' || zone === 'right' ? 'row' : 'col', sizes: [0.5, 0.5], children: first ? [fresh, g] : [g, fresh] }
}

/** Moves a tab onto a group: 'center' joins it (at `index`), an edge splits the group and puts the tab in the new half. */
export function moveTab(root: Node, tabId: string, gid: string, zone: Zone, index?: number): Node {
  const f = findTab(root, tabId)
  if (!f || !findGroup(root, gid)) return root
  if (zone !== 'center' && f.group.id === gid && f.group.tabs.length === 1) return root
  if (zone === 'center') {
    let at = index
    if (f.group.id === gid && at !== undefined && f.group.tabs.findIndex((t) => t.id === tabId) < at) at -= 1
    return fix(addTab(dropTab(root, tabId), gid, f.tab, at))
  }
  const fresh = newGroup([f.tab])
  return fix(mapGroup(dropTab(root, tabId), gid, (g) => splitAround(g, zone, fresh)))
}

/** Opens a new tab in a fresh group beside `gid` (right / below). */
export function openBeside(root: Node, gid: string, tab: TabRef, dir: 'row' | 'col' = 'row'): Node {
  return fix(mapGroup(root, gid, (g) => splitAround(g, dir === 'row' ? 'right' : 'bottom', newGroup([tab]))))
}

/** Moves the group's active tab into a new group beside it. No-op if the group has a single tab. */
export function splitGroup(root: Node, gid: string, dir: 'row' | 'col'): Node {
  const g = findGroup(root, gid)
  if (!g || g.tabs.length < 2 || !g.active) return root
  return moveTab(root, g.active, gid, dir === 'row' ? 'right' : 'bottom')
}

export function closeGroup(root: Node, gid: string): Node {
  return fix(mapGroup(root, gid, (g) => ({ ...g, tabs: [], active: null })))
}

export function setTabTitle(root: Node, tabId: string, title: string): Node {
  const f = findTab(root, tabId)
  if (!f || f.tab.title === title) return root
  return mapGroup(root, f.group.id, (g) => ({ ...g, tabs: g.tabs.map((t) => (t.id === tabId ? { ...t, title } : t)) }))
}

/** Replaces the sizes of the split that directly contains the children at `path` (array of child indexes). */
export function setSizes(root: Node, path: number[], sizes: number[]): Node {
  if (root.kind === 'group') return root
  if (!path.length) return { ...root, sizes }
  const [i, ...rest] = path
  return { ...root, children: root.children.map((c, j) => (j === i ? setSizes(c, rest, sizes) : c)) }
}

/** Moves the gutter between children i and i+1 by `delta` (a fraction), keeping both at least `minFrac`. */
export function resizeSizes(sizes: number[], i: number, delta: number, minFrac: number): number[] {
  const pair = sizes[i] + sizes[i + 1]
  const min = Math.min(minFrac, pair / 2)
  const a = Math.min(Math.max(sizes[i] + delta, min), pair - min)
  const out = [...sizes]
  out[i] = a
  out[i + 1] = pair - a
  return out
}

export function cycleTab(root: Node, gid: string, step: 1 | -1): Node {
  const g = findGroup(root, gid)
  if (!g || g.tabs.length < 2) return root
  const i = g.tabs.findIndex((t) => t.id === g.active)
  return setActive(root, gid, g.tabs[(i + step + g.tabs.length) % g.tabs.length].id)
}

export function isLayout(n: any): n is Node {
  if (!n || typeof n !== 'object') return false
  if (n.kind === 'group') return typeof n.id === 'string' && Array.isArray(n.tabs) && n.tabs.every((t: any) => t && typeof t.id === 'string' && typeof t.type === 'string')
  return n.kind === 'split' && (n.dir === 'row' || n.dir === 'col') && Array.isArray(n.children) && Array.isArray(n.sizes)
    && n.children.length === n.sizes.length && n.children.length > 0 && n.children.every(isLayout)
}

/* ---------- presets ---------- */
const g = (...types: PanelType[]) => newGroup(types.map((t) => newTab(t)))
const row = (sizes: number[], ...children: Node[]): SplitNode => ({ kind: 'split', dir: 'row', sizes, children })
const col = (sizes: number[], ...children: Node[]): SplitNode => ({ kind: 'split', dir: 'col', sizes, children })

export const PRESETS: Record<string, () => Node> = {
  'Sessão': () => col([0.72, 0.28], row([0.4, 0.3, 0.3], g('log'), g('scene'), g('combat')), g('calc', 'books', 'audio')),
  'Combate': () => row([0.36, 0.36, 0.28], g('combat'), g('log'), col([0.5, 0.5], g('calc'), g('scene'))),
  'Preparação': () => row([0.5, 0.5], g('scene-edit', 'scene'), col([0.5, 0.5], g('books'), g('audio', 'party'))),
}
export const PRESET_NAMES = Object.keys(PRESETS)
