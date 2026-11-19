import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { get, list } from '../api'
import Icon from '../components/Icon'
import type { Campaign, System } from '../../shared/types'
import { nextTurn } from './commands'
import { WsContext, useWs, type OpenOpts, type OpenSpec, type WsApi } from './ctx'
import { useItems } from './data'
import Explorer from './Explorer'
import Group from './Group'
import {
  PRESETS, PRESET_NAMES, addTab, closeGroup, cycleTab, findByKey, findGroup, findTab, groups, isLayout, moveTab, newGroup, newTab, openBeside,
  removeTab, resizeSizes, setActive, setSizes, splitGroup, tabKey, type Node, type Zone,
} from './layout'
import { activeEncounterId, logContext, sceneKey, setLogContext, undoLast } from './log'
import { Dialogs, Palette, Shortcuts } from './Overlays'
import Logo from '../components/Logo'
import { confirmDialog, emit, listen, lsGet, lsSet, toast } from './util'
import './workspace.css'

type State = { root: Node; focus: string | null }
const layoutKey = (cid: number) => `rpgtable:layout:${cid}`
const savedKey = (cid: number) => `rpgtable:layouts:${cid}`

function loadState(cid: number): State {
  try {
    const s = JSON.parse(lsGet(layoutKey(cid)) ?? 'null')
    if (s && isLayout(s.root)) return { root: s.root, focus: findGroup(s.root, s.focus) ? s.focus : groups(s.root)[0].id }
  } catch {}
  const root = PRESETS['Sessão']()
  return { root, focus: groups(root)[0].id }
}
function loadSaved(cid: number): Record<string, Node> {
  try {
    const s = JSON.parse(lsGet(savedKey(cid)) ?? '{}')
    return Object.fromEntries(Object.entries(s).filter(([, v]) => isLayout(v))) as Record<string, Node>
  } catch { return {} }
}
const inField = (t: EventTarget | null) => { const e = t as HTMLElement | null; return !!e && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName)) }
const fmtClock = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }

function Gutter({ dir, sizes, i, path }: { dir: 'row' | 'col'; sizes: number[]; i: number; path: number[] }) {
  const { resize } = useWs()
  const [drag, setDrag] = useState(false)
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget, box = el.parentElement!.getBoundingClientRect()
    const total = dir === 'row' ? box.width : box.height
    const start = dir === 'row' ? e.clientX : e.clientY
    el.setPointerCapture(e.pointerId); setDrag(true)
    document.body.style.userSelect = 'none'
    const mv = (ev: PointerEvent) => resize(path, resizeSizes(sizes, i, ((dir === 'row' ? ev.clientX : ev.clientY) - start) / total, 160 / total))
    const up = () => { setDrag(false); document.body.style.userSelect = ''; el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up) }
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up)
  }
  return <div className={`gut ${dir === 'row' ? 'h' : 'v'}${drag ? ' drag' : ''}`} role="separator" aria-orientation={dir === 'row' ? 'vertical' : 'horizontal'} onPointerDown={down} />
}
function Tree({ node, path }: { node: Node; path: number[] }) {
  if (node.kind === 'group') return <Group g={node} />
  return (
    <div className={`wsplit ${node.dir === 'row' ? 'h' : 'v'}`}>
      {node.children.flatMap((c, i) => [
        i > 0 ? <Gutter key={'g' + i} dir={node.dir} sizes={node.sizes} i={i - 1} path={path} /> : null,
        <div className="cell" key={c.kind === 'group' ? c.id : `s${i}`} style={{ flex: `${node.sizes[i]} 1 0px` }}><Tree node={c} path={[...path, i]} /></div>,
      ])}
    </div>
  )
}

export default function WorkspaceRoute() {
  const id = useParams().id
  return <Workspace key={id} cid={Number(id)} />
}

function Workspace({ cid }: { cid: number }) {
  const nav = useNavigate()
  const [{ root, focus }, setState] = useState<State>(() => loadState(cid))
  const [saved, setSaved] = useState<Record<string, Node>>(() => loadSaved(cid))
  const [maxGroup, setMaxGroup] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [campaign, setCampaign] = useState<Campaign>()
  const [system, setSystem] = useState<System>()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [exOpen, setExOpen] = useState(() => (lsGet('rpgtable:explorer') ?? (window.innerWidth >= 900 ? '1' : '0')) !== '0')
  const [exW, setExW] = useState(() => Number(lsGet('rpgtable:explorerW')) || 270)
  const [palette, setPalette] = useState(false)
  const [help, setHelp] = useState(false)
  useEffect(() => listen('rpgtable:help', () => setHelp(true)), [])
  const [menu, setMenu] = useState<'camp' | 'layout' | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [t0, setT0] = useState(() => Number(lsGet(`rpgtable:clock:${cid}`)) || Date.now())
  const [now, setNow] = useState(Date.now())
  const { items, reload } = useItems(cid)
  const stateRef = useRef<State>({ root, focus })
  stateRef.current = { root, focus }

  useEffect(() => { if (!lsGet(`rpgtable:clock:${cid}`)) lsSet(`rpgtable:clock:${cid}`, String(t0)) }, [cid, t0])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => {
    get<Campaign>('campaigns', cid).then((c) => { setCampaign(c); return get<System>('systems', c.system_id) }).then(setSystem).catch(() => {})
    list<Campaign>('campaigns').then(setCampaigns).catch(() => {})
  }, [cid])
  useEffect(() => { lsSet(layoutKey(cid), JSON.stringify({ root, focus })) }, [root, focus, cid])
  useEffect(() => { lsSet(savedKey(cid), JSON.stringify(saved)) }, [saved, cid])
  useEffect(() => { lsSet('rpgtable:explorer', exOpen ? '1' : '0') }, [exOpen])
  useEffect(() => { lsSet('rpgtable:explorerW', String(exW)) }, [exW])

  useEffect(() => {
    const cur = logContext()
    const sc = items.scenes.find((s) => s.id === Number(lsGet(sceneKey(cid))))
    const live = items.sessions.filter((s) => (s.number ?? 0) > 0) // number 0 / empty = campaign roadmap, not a live session
    const fb = live.find((s) => s.status === 'planned') ?? live[live.length - 1]
    setLogContext({ campaignId: cid, sessionId: cur?.campaignId === cid && cur.sessionId ? cur.sessionId : sc?.session_id ?? fb?.id ?? null })
  }, [cid, items])
  useEffect(() => () => setLogContext(null), [])

  const upd = useCallback((fn: (r: Node, f: string | null) => { root: Node; focus?: string | null }) => {
    setState((s) => {
      const n = fn(s.root, s.focus)
      let f = n.focus === undefined ? s.focus : n.focus
      if (!f || !findGroup(n.root, f)) f = groups(n.root)[0]?.id ?? null
      return { root: n.root, focus: f }
    })
  }, [])

  const focusGid = (r: Node, f: string | null) => (f && findGroup(r, f) ? f : groups(r)[0].id)

  const open = useCallback((spec: OpenSpec, opts: OpenOpts = {}) => {
    const key = tabKey(spec)
    upd((r, f) => {
      const hit = findByKey(r, key)
      if (hit) return { root: setActive(r, hit.group.id, hit.tab.id), focus: hit.group.id }
      const tab = newTab(spec.type, spec.ref, spec.title)
      const target = opts.group ?? focusGid(r, f)
      if (opts.beside) {
        const next = openBeside(r, target, tab)
        return { root: next, focus: findTab(next, tab.id)?.group.id }
      }
      return { root: addTab(r, target, tab), focus: target }
    })
  }, [upd])

  const api: WsApi = {
    campaignId: cid, campaign, system, items, reloadItems: reload, root, focus, maxGroup, dragging, setDragging,
    activeKey: (() => { const g = focus ? findGroup(root, focus) : null; const t = g?.tabs.find((x) => x.id === g.active); return t ? tabKey(t) : null })(),
    open,
    activate: (gid, tabId) => upd((r) => ({ root: setActive(r, gid, tabId), focus: gid })),
    focusGroup: (gid) => upd((r) => ({ root: r, focus: gid })),
    closeTab: (id) => upd((r) => ({ root: removeTab(r, id) })),
    closeKey: (key) => upd((r) => { const h = findByKey(r, key); return { root: h ? removeTab(r, h.tab.id) : r } }),
    move: (tabId, gid, zone: Zone, index) => upd((r) => { const n = moveTab(r, tabId, gid, zone, index); return { root: n, focus: findTab(n, tabId)?.group.id } }),
    splitFocus: (gid, dir) => upd((r, f) => { const g = gid ?? focusGid(r, f); const n = splitGroup(r, g, dir); const a = findGroup(r, g)?.active; return { root: n, focus: a ? findTab(n, a)?.group.id : g } }),
    maximize: (gid) => setMaxGroup((m) => (gid && m !== gid ? gid : null)),
    closeGroup: (gid) => { setMaxGroup((m) => (m === gid ? null : m)); upd((r) => ({ root: closeGroup(r, gid) })) },
    resize: (path, sizes) => upd((r) => ({ root: setSizes(r, path, sizes) })),
    preset: (name) => {
      const mk = PRESETS[name]
      const next = mk ? mk() : saved[name] ? structuredClone(saved[name]) : null
      if (!next) return false
      setMaxGroup(null); upd(() => ({ root: next, focus: null })); toast(`Layout: ${name}`)
      return true
    },
    layoutNames: { presets: PRESET_NAMES, saved: Object.keys(saved) },
    saveLayout: (name) => {
      const n = name.trim()
      if (!n) return
      if (PRESETS[n]) { toast('Esse nome é de um layout embutido.'); return }
      setSaved((s) => ({ ...s, [n]: stateRef.current.root })); toast(`Layout salvo: ${n}`)
    },
    deleteLayout: (name) => setSaved((s) => { const n = { ...s }; delete n[name]; return n }),
  }
  const apiRef = useRef(api)
  apiRef.current = api

  const focusComposer = (text?: string) => {
    const a = apiRef.current
    if (!findByKey(stateRef.current.root, 'log')) { a.open({ type: 'log' }); setTimeout(() => emit('rpgtable:focus-composer', { text }), 80) }
    else {
      const h = findByKey(stateRef.current.root, 'log')!
      a.activate(h.group.id, h.tab.id)
      setTimeout(() => emit('rpgtable:focus-composer', { text }), 0)
    }
  }
  const cmdCtx = () => ({ campaignId: cid, system, items, open, preset: apiRef.current.preset, layoutNames: [...PRESET_NAMES, ...Object.keys(saved)] })

  const doUndo = async () => {
    try { const t = await undoLast(); toast(t ? `Desfeito: ${t}` : 'Nada para desfazer.') } catch (e) { toast((e as Error).message) }
  }
  const doNext = async () => { try { await nextTurn(cmdCtx()) } catch (e) { toast((e as Error).message) } }
  const doDamage = async () => {
    try {
      const id = await activeEncounterId(cid)
      const enc = id ? await get<{ active_id: number | null }>('encounters', id) : null
      const c = enc?.active_id ? await get<{ name: string }>('combatants', enc.active_id) : null
      focusComposer(c ? `/dano ${c.name} ` : '/dano ')
    } catch { focusComposer('/dano ') }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const a = apiRef.current, mod = e.metaKey || e.ctrlKey, k = e.key
      if (mod && !e.shiftKey && !e.altKey && k.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); return }
      if (mod && !e.shiftKey && !e.altKey && k.toLowerCase() === 'b') { e.preventDefault(); setExOpen((o) => !o); return }
      if (inField(e.target) || e.isComposing) return
      const { root: r, focus: f } = stateRef.current
      const fg = f ? findGroup(r, f) : null
      if (mod && !e.altKey && k === '\\') { e.preventDefault(); a.splitFocus(null, 'row'); return }
      if (mod && e.shiftKey && k.toLowerCase() === 'm') { e.preventDefault(); a.maximize(focusGid(r, f)); return }
      if (mod && !e.shiftKey && !e.altKey && k.toLowerCase() === 'z') { e.preventDefault(); doUndo(); return }
      if (e.altKey && !mod) {
        if (e.code === 'KeyW') { e.preventDefault(); if (fg?.active) a.closeTab(fg.active) }
        else if (e.code === 'BracketLeft' || e.code === 'BracketRight') { e.preventDefault(); upd((x, ff) => ({ root: cycleTab(x, focusGid(x, ff), e.code === 'BracketRight' ? 1 : -1) })) }
        else if (/^Digit[1-9]$/.test(e.code)) { e.preventDefault(); const names = [...PRESET_NAMES, ...Object.keys(saved)]; const n = names[Number(e.code.slice(5)) - 1]; if (n) a.preset(n) }
        return
      }
      if (mod) return
      if (k === '/') { e.preventDefault(); focusComposer() }
      else if (k === '?') { e.preventDefault(); setHelp(true) }
      else if (k === 'n' || k === 'N') { e.preventDefault(); doNext() }
      else if (k === 'd' || k === 'D') { e.preventDefault(); doDamage() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!menu) return
    const c = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest('.dd')) setMenu(null) }
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null)
    window.addEventListener('pointerdown', c); window.addEventListener('keydown', k)
    return () => { window.removeEventListener('pointerdown', c); window.removeEventListener('keydown', k) }
  }, [menu])

  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget, x0 = e.clientX, w0 = exW
    el.setPointerCapture(e.pointerId); document.body.style.userSelect = 'none'
    const mv = (ev: PointerEvent) => setExW(Math.min(480, Math.max(200, w0 + ev.clientX - x0)))
    const up = () => { document.body.style.userSelect = ''; el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up) }
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up)
  }

  const paletteActions = useMemo(() => [
    { label: 'Alternar explorador', hint: '⌘B', run: () => setExOpen((o) => !o) },
    { label: 'Dividir grupo (aba ativa à direita)', hint: '⌘\\', run: () => apiRef.current.splitFocus(null, 'row') },
    { label: 'Maximizar grupo', hint: '⌘⇧M', run: () => { const { root: r, focus: f } = stateRef.current; apiRef.current.maximize(focusGid(r, f)) } },
    { label: 'Próximo turno', hint: 'N', run: () => doNext() },
    { label: 'Desfazer última entrada de combate', hint: '⌘Z', run: () => doUndo() },
    { label: 'Atalhos de teclado', hint: '?', run: () => setHelp(true) },
    { label: 'Todas as campanhas', run: () => nav('/') },
  ], []) // eslint-disable-line react-hooks/exhaustive-deps

  const names = [...PRESET_NAMES, ...Object.keys(saved)]
  const resetClock = async () => {
    if (!(await confirmDialog('Reiniciar o relógio da sessão?', { okLabel: 'Reiniciar' }))) return
    const t = Date.now(); setT0(t); lsSet(`rpgtable:clock:${cid}`, String(t))
  }

  return (
    <WsContext.Provider value={api}>
      <div className={`wsapp${exOpen ? '' : ' no-ex'}${maxGroup ? ' has-max' : ''}`} style={{ ['--EXW' as any]: `${exW}px` }}>
        <header className="top">
          <Link to="/" className="brand" title="Todas as campanhas"><Logo /></Link>
          <div className="dd">
            <button className="camp" aria-haspopup="menu" aria-expanded={menu === 'camp'} onClick={() => setMenu(menu === 'camp' ? null : 'camp')}>
              <span className="cn">{campaign?.name ?? '…'}</span><Icon name="down" size={14} />
            </button>
            {menu === 'camp' && (
              <div className="menu" role="menu">
                {campaigns.map((c) => <button key={c.id} role="menuitem" className={c.id === cid ? 'cur' : ''} onClick={() => { setMenu(null); if (c.id !== cid) nav(`/c/${c.id}`) }}>{c.name}{c.id === cid && <Icon name="check" size={14} />}</button>)}
                <hr />
                <button role="menuitem" onClick={() => { setMenu(null); nav('/') }}>Todas as campanhas</button>
                <hr />
                {(['library-bestiary', 'library-books', 'library-audio', 'library-systems'] as const).map((t) => (
                  <button key={t} role="menuitem" onClick={() => { setMenu(null); open({ type: t }) }}>{{ 'library-bestiary': 'Bestiário', 'library-books': 'Livros', 'library-audio': 'Áudio', 'library-systems': 'Sistemas' }[t]}</button>
                ))}
              </div>
            )}
          </div>
          {system && <span className="sysn">{system.name}</span>}
          <div className="right">
            <button className="clock" title="Tempo desde o início da sessão (clique para reiniciar)" onClick={resetClock}><span>Sessão</span><b className="mono">{fmtClock(now - t0)}</b></button>
            <div className="dd">
              <button className="btn ghost sm" aria-haspopup="menu" aria-expanded={menu === 'layout'} onClick={() => setMenu(menu === 'layout' ? null : 'layout')}><Icon name="layout" size={15} /><span className="lbl">Layout</span></button>
              {menu === 'layout' && (
                <div className="menu right" role="menu">
                  {names.map((n, i) => (
                    <div className="mrow" key={n}>
                      <button role="menuitem" onClick={() => { setMenu(null); api.preset(n) }}>{n}{i < 9 && <span className="kbd">⌥{i + 1}</span>}</button>
                      {saved[n] && <button className="btn-x" title={`Excluir layout ${n}`} aria-label={`Excluir layout ${n}`} onClick={() => api.deleteLayout(n)}><Icon name="x" size={12} /></button>}
                    </div>
                  ))}
                  <hr />
                  {saving === null
                    ? <button role="menuitem" onClick={() => setSaving('')}>Salvar layout atual como…</button>
                    : <form className="savef" onSubmit={(e) => { e.preventDefault(); api.saveLayout(saving); setSaving(null); setMenu(null) }}>
                        <input className="inp" autoFocus placeholder="Nome do layout" aria-label="Nome do layout" value={saving} onChange={(e) => setSaving(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setSaving(null)} />
                        <button className="btn sm pri" disabled={!saving.trim()}>Salvar</button>
                      </form>}
                </div>
              )}
            </div>
            <button className="btn ghost ico" title="Explorador (⌘B)" aria-label="Explorador" aria-pressed={exOpen} onClick={() => setExOpen((o) => !o)}><Icon name="sidebar" size={16} /></button>
            <button className="btn srch" onClick={() => setPalette(true)}><Icon name="search" size={14} /><span className="lbl">Buscar</span><span className="kbd">⌘K</span></button>
            <button className="btn ghost ico" title="Atalhos (?)" aria-label="Atalhos" onClick={() => setHelp(true)}><Icon name="help" size={16} /></button>
          </div>
        </header>
        <div className="wsbody">
          {exOpen && <><Explorer /><div className="exgut" role="separator" aria-orientation="vertical" onPointerDown={startResize} onDoubleClick={() => setExW(270)} /></>}
          <main className="tree"><Tree node={root} path={[]} /></main>
        </div>
      </div>
      {palette && <Palette onClose={() => setPalette(false)} actions={paletteActions} />}
      {help && <Shortcuts onClose={() => setHelp(false)} />}
      <Dialogs />
    </WsContext.Provider>
  )
}
