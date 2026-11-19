import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { create, getJson, remove, update } from '../api'
import Icon from '../components/Icon'
import { useWs, type OpenSpec } from './ctx'
import { notifyItems } from './data'
import { tabKey, type PanelType } from './layout'
import { enterScene } from './log'
import { confirmDialog, lsGet, lsSet, norm, toast } from './util'

interface ExItem {
  key: string; spec: OpenSpec; title: string; icon: string; depth: 1 | 2 | 3
  table?: string; field?: string; id?: number; play?: number; chev?: string
}

const RENAME: Partial<Record<PanelType, { table: string; field: string }>> = {
  session: { table: 'sessions', field: 'title' }, 'scene-edit': { table: 'scenes', field: 'title' }, encounter: { table: 'encounters', field: 'name' },
  character: { table: 'characters', field: 'name' }, note: { table: 'notes', field: 'title' }, creature: { table: 'creatures', field: 'name' }, system: { table: 'systems', field: 'name' },
}
const ExContext = createContext<any>(null)
const DELETE: Partial<Record<PanelType, string>> = { ...Object.fromEntries(Object.entries(RENAME).map(([k, v]) => [k, v!.table])), book: 'books' }

function Row({ it }: { it: ExItem }) {
  const { ws, cid, renaming, setRenaming, doRename, isOpen, toggle, loadChapters, setMenu } = useContext(ExContext)
    const on = ws.activeKey === it.key
  const done = useRef(false)
  const commit = (v: string) => { if (done.current) return; done.current = true; doRename(it, v) }
    if (renaming === it.key) return (
      <div className={`tr-i d${it.depth}`}>
        <span className="k"><Icon name={it.icon} size={14} /></span>
        <input className="tr-edit" autoFocus defaultValue={it.title.replace(/^Sessão \d+ — /, '')} aria-label="Novo nome"
          onFocus={(e) => e.currentTarget.select()} onBlur={(e) => commit(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(e.currentTarget.value); if (e.key === 'Escape') { done.current = true; setRenaming(null) } }} />
      </div>
    )
    return (
      <div className={`tr-i d${it.depth}${on ? ' on' : ''}`} role="treeitem" aria-selected={on}
        onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, it }) }}>
        {it.chev && <button className="tr-chev" aria-label="Expandir" aria-expanded={isOpen(it.chev)} onClick={() => { toggle(it.chev!); if (it.id && it.chev!.startsWith('bk:')) loadChapters(it.id) }}><Icon name="chevron" size={12} /></button>}
        <button className="tr-main" title={it.title} onClick={(e) => ws.open(it.spec, { beside: e.metaKey || e.ctrlKey })}>
          <span className="k"><Icon name={it.icon} size={14} /></span><span className="t">{it.title}</span>
        </button>
        {it.play && <button className="tr-act" title="Entrar na cena (ao vivo)" aria-label="Entrar na cena" onClick={() => { ws.open({ type: 'scene' }); enterScene(cid, it.play!) }}><Icon name="play2" size={12} /></button>}
      </div>
    )
}

function Head({ id, label, count, onAdd, addTitle, sub }: { id: string; label: string; count?: number; onAdd?: () => void; addTitle?: string; sub?: boolean }) {
  const { isOpen, toggle } = useContext(ExContext)
  return (
    <div className={`tr-h${sub ? ' sub' : ''}`}>
      <button className="tr-hm" aria-expanded={isOpen(id)} onClick={() => toggle(id)}><Icon name="chevron" size={12} /><span>{label}</span>{count !== undefined && <span className="cnt">{count}</span>}</button>
      {onAdd && <button className="tr-act" title={addTitle ?? 'Novo'} aria-label={addTitle ?? 'Novo'} onClick={onAdd}><Icon name="plus" size={13} /></button>}
    </div>
  )
}

export default function Explorer() {
  const ws = useWs()
  const cid = ws.campaignId
  const { items } = ws
  const [q, setQ] = useState('')
  const [shut, setShut] = useState<Set<string>>(() => { try { return new Set(JSON.parse(lsGet(`rpgtable:tree:${cid}`) ?? '["lib","lib:bk","lib:sys","lib:bes"]')) } catch { return new Set() } })
  const [menu, setMenu] = useState<{ x: number; y: number; it: ExItem } | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [chapters, setChapters] = useState<Record<number, { id: number; heading: string | null }[]>>({})
  const qn = norm(q.trim())
  const searching = !!qn

  useEffect(() => { lsSet(`rpgtable:tree:${cid}`, JSON.stringify([...shut])) }, [shut, cid])
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('pointerdown', close); window.addEventListener('keydown', key); window.addEventListener('blur', close)
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', key); window.removeEventListener('blur', close) }
  }, [menu])

  const toggle = (k: string) => setShut((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const isOpen = (k: string) => searching || !shut.has(k)
  const match = (t: string) => !qn || norm(t).includes(qn)

  const loadChapters = (bookId: number) => {
    if (chapters[bookId]) return
    getJson<{ id: number; heading: string | null }[]>(`/api/books/${bookId}/chunks`).then((r) => setChapters((c) => ({ ...c, [bookId]: r }))).catch(() => {})
  }
  useEffect(() => { if (!shut.has('lib') && !shut.has('lib:bk')) items.books.forEach((b) => { if (!shut.has(`bk:${b.id}`)) loadChapters(b.id) }) }, [items.books, shut]) // eslint-disable-line react-hooks/exhaustive-deps

  const addNew = async (table: string, body: Record<string, unknown>, type: PanelType) => {
    try {
      const row = await create<{ id: number }>(table, { campaign_id: cid, ...body })
      notifyItems()
      ws.open({ type, ref: row.id })
      setShut((s) => { const n = new Set(s); n.delete('sec:' + type); return n })
      setRenaming(tabKey({ type, ref: row.id }))
    } catch (e) { toast((e as Error).message) }
  }

  const doRename = async (it: ExItem, name: string) => {
    setRenaming(null)
    const n = name.trim()
    if (!n || !it.table || !it.field || !it.id) return
    try { await update(it.table, it.id, { [it.field]: n }); notifyItems() } catch (e) { toast((e as Error).message) }
  }
  const doDelete = async (it: ExItem) => {
    const table = DELETE[it.spec.type]
    if (!table || !it.id) return
    if (!(await confirmDialog(`Excluir “${it.title}”? Isso não pode ser desfeito.`, { danger: true, okLabel: 'Excluir' }))) return
    try { await remove(table, it.id); ws.closeKey(it.key); notifyItems() } catch (e) { toast((e as Error).message) }
  }

  const sesTitle = (s: { number: number | null; title: string | null }) => `Sessão ${s.number ?? ''}${s.title ? ' — ' + s.title : ''}`.replace('Sessão  ', 'Sessão ')
  const sceneRows = (list: typeof items.scenes, depth: 2 | 3 = 2) => [...list].sort((a, b) => a.ord - b.ord || a.id - b.id).filter((s) => match(s.title)).map((s) => (
    <Row key={'s' + s.id} it={{ key: tabKey({ type: 'scene-edit', ref: s.id }), spec: { type: 'scene-edit', ref: s.id }, title: s.title || 'Sem título', icon: 'scene', depth, table: 'scenes', field: 'title', id: s.id, play: s.id }} />
  ))
  const orphan = items.scenes.filter((s) => !items.sessions.some((x) => x.id === s.session_id))
  const pcs = items.characters.filter((c) => c.kind === 'pc'), npcs = items.characters.filter((c) => c.kind === 'npc')
  const simple = (type: PanelType, rows: { id: number; title: string }[], icon: string, table: string, field: string, depth: 1 | 2 | 3 = 2) =>
    rows.filter((r) => match(r.title)).map((r) => <Row key={type + r.id} it={{ key: tabKey({ type, ref: r.id }), spec: { type, ref: r.id }, title: r.title, icon, depth, table, field, id: r.id }} />)

  const secVisible = (titles: string[]) => !searching || titles.some(match)
  const sessionsVisible = secVisible([...items.sessions.map(sesTitle), ...items.scenes.map((s) => s.title)])

  return (
    <ExContext.Provider value={{ ws, cid, renaming, setRenaming, doRename, isOpen, toggle, loadChapters, setMenu }}>
    <aside className="explorer" aria-label="Explorador">
      <div className="exh">
        <input className="inp" type="search" placeholder="Filtrar…" aria-label="Filtrar explorador" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setQ('')} />
      </div>
      <div className="exb" role="tree">
        {sessionsVisible && <>
          <Head id="sec:session" label="Sessões" count={items.sessions.length} addTitle="Nova sessão" onAdd={() => addNew('sessions', { number: items.sessions.length + 1, title: 'Nova sessão', status: 'planned' }, 'session')} />
          {isOpen('sec:session') && <>
            {items.sessions.filter((s) => !searching || match(sesTitle(s)) || items.scenes.some((x) => x.session_id === s.id && match(x.title))).map((s) => {
              const own = items.scenes.filter((x) => x.session_id === s.id)
              return (
                <div key={s.id}>
                  <div className="tr-row">
                    <Row it={{ key: tabKey({ type: 'session', ref: s.id }), spec: { type: 'session', ref: s.id }, title: sesTitle(s), icon: 'campaigns', depth: 1, table: 'sessions', field: 'title', id: s.id, chev: 'ses:' + s.id }} />
                    <button className="tr-act row-act" title="Nova cena nesta sessão" aria-label="Nova cena" onClick={() => addNew('scenes', { session_id: s.id, ord: own.length, title: 'Nova cena' }, 'scene-edit')}><Icon name="plus" size={13} /></button>
                  </div>
                  {isOpen('ses:' + s.id) && sceneRows(own)}
                </div>
              )
            })}
            {(orphan.length > 0 || !items.sessions.length) && (!searching || orphan.some((s) => match(s.title))) && <>
              <div className="tr-g">Sem sessão<button className="tr-act" title="Nova cena" aria-label="Nova cena sem sessão" onClick={() => addNew('scenes', { session_id: null, ord: orphan.length, title: 'Nova cena' }, 'scene-edit')}><Icon name="plus" size={13} /></button></div>
              {sceneRows(orphan)}
            </>}
          </>}
        </>}

        {secVisible(items.encounters.map((e) => e.name)) && <>
          <Head id="sec:encounter" label="Encontros" count={items.encounters.length} addTitle="Novo encontro" onAdd={() => addNew('encounters', { name: `Encontro ${items.encounters.length + 1}` }, 'encounter')} />
          {isOpen('sec:encounter') && simple('encounter', items.encounters.map((e) => ({ id: e.id, title: e.name })), 'encounter', 'encounters', 'name', 1)}
        </>}

        {secVisible(items.characters.map((c) => c.name)) && <>
          <Head id="sec:character" label="Personagens" count={items.characters.length} />
          {isOpen('sec:character') && <>
            <div className="tr-g">PJs<button className="tr-act" title="Novo PJ" aria-label="Novo PJ" onClick={() => addNew('characters', { kind: 'pc', name: 'Novo personagem', data: {} }, 'character')}><Icon name="plus" size={13} /></button></div>
            {simple('character', pcs.map((c) => ({ id: c.id, title: c.name })), 'pc', 'characters', 'name')}
            <div className="tr-g">NPCs<button className="tr-act" title="Novo NPC" aria-label="Novo NPC" onClick={() => addNew('characters', { kind: 'npc', name: 'Novo NPC', data: {} }, 'character')}><Icon name="plus" size={13} /></button></div>
            {simple('character', npcs.map((c) => ({ id: c.id, title: c.name })), 'pc', 'characters', 'name')}
          </>}
        </>}

        {secVisible(items.notes.map((n) => n.title || n.body)) && <>
          <Head id="sec:note" label="Notas" count={items.notes.length} addTitle="Nova nota" onAdd={() => addNew('notes', { title: 'Nova nota', body: '' }, 'note')} />
          {isOpen('sec:note') && simple('note', items.notes.map((n) => ({ id: n.id, title: n.title || n.body.slice(0, 32) || 'Nota' })), 'note', 'notes', 'title')}
        </>}

        <Head id="lib" label="Biblioteca" />
        {isOpen('lib') && <>
          <Head sub id="lib:bes" label="Bestiário" count={items.creatures.length} addTitle="Nova criatura" onAdd={() => addNew('creatures', { system_id: ws.campaign?.system_id, name: 'Nova criatura', stats: {} }, 'creature')} />
          {isOpen('lib:bes') && <>
            <Row it={{ key: 'library-bestiary', spec: { type: 'library-bestiary' }, title: 'Abrir bestiário', icon: 'bestiary', depth: 2 }} />
            {simple('creature', items.creatures.map((c) => ({ id: c.id, title: c.name })), 'bestiary', 'creatures', 'name', 3)}
          </>}
          <Head sub id="lib:bk" label="Livros" count={items.books.length} addTitle="Gerenciar livros" onAdd={() => ws.open({ type: 'library-books' })} />
          {isOpen('lib:bk') && items.books.filter((b) => !searching || match(b.title) || (chapters[b.id] ?? []).some((c) => match(c.heading ?? ''))).map((b) => (
            <div key={b.id}>
              <Row it={{ key: 'bookroot:' + b.id, spec: { type: 'library-books' }, title: b.title, icon: 'books', depth: 2, table: 'books', id: b.id, chev: 'bk:' + b.id }} />
              {isOpen('bk:' + b.id) && (chapters[b.id] ?? []).slice(0, 300).filter((c) => !searching || match(c.heading ?? '') || match(b.title)).map((c) => {
                const t = (c.heading ?? '(sem título)').split(' › ').slice(-1)[0]
                return <Row key={c.id} it={{ key: tabKey({ type: 'book', ref: `${b.id}:${c.id}` }), spec: { type: 'book', ref: `${b.id}:${c.id}`, title: t }, title: t, icon: 'note', depth: 3 }} />
              })}
            </div>
          ))}
          {match('Áudio') && <Row it={{ key: 'library-audio', spec: { type: 'library-audio' }, title: 'Áudio', icon: 'audio', depth: 1 }} />}
          <Head sub id="lib:sys" label="Sistemas" count={items.systems.length} addTitle="Gerenciar sistemas" onAdd={() => ws.open({ type: 'library-systems' })} />
          {isOpen('lib:sys') && simple('system', items.systems.map((s) => ({ id: s.id, title: s.name })), 'systems', 'systems', 'name')}
        </>}
      </div>
      {menu && (
        <div className="ctxm" style={{ left: Math.min(menu.x, window.innerWidth - 200), top: Math.min(menu.y, window.innerHeight - 150) }} role="menu" onPointerDown={(e) => e.stopPropagation()}>
          <button role="menuitem" onClick={() => { ws.open(menu.it.spec); setMenu(null) }}>Abrir</button>
          <button role="menuitem" onClick={() => { ws.open(menu.it.spec, { beside: true }); setMenu(null) }}>Abrir ao lado</button>
          {RENAME[menu.it.spec.type] && menu.it.id && <button role="menuitem" onClick={() => { setRenaming(menu.it.key); setMenu(null) }}>Renomear</button>}
          {DELETE[menu.it.spec.type] && menu.it.id && <><hr /><button role="menuitem" className="danger" onClick={() => { const it = menu.it; setMenu(null); doDelete(it) }}>Excluir…</button></>}
        </div>
      )}
    </aside>
    </ExContext.Provider>
  )
}
