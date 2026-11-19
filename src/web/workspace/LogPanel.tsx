import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { list } from '../api'
import { COMMANDS, openables, runCommand, suggest, type SuggestData } from './commands'
import { useWs } from './ctx'
import { activeEncounterId, onLog, sceneKey, type LogEntry, type LogKind } from './log'
import { emit, hhmm, listen, lsGet, lsSet, norm } from './util'

type Local = { id: string; tone: 'bad' | 'info'; text: string; usage?: string; t: string }
type Row = LogEntry | Local
const isLocal = (r: Row): r is Local => typeof r.id === 'string'

const FILTERS: [string, LogKind | null][] = [['Tudo', null], ['Combate', 'combat'], ['Rolagens', 'roll'], ['Cenas', 'scene'], ['Notas', 'note']]
const sgn = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n)

function Bar({ from, to, cls, animate }: { from: number; to: number; cls?: string; animate?: boolean }) {
  const [w, setW] = useState(animate ? from : to)
  useEffect(() => { if (!animate) return; const r = requestAnimationFrame(() => requestAnimationFrame(() => setW(to))); return () => cancelAnimationFrame(r) }, [animate, to])
  return <div className="bar"><i className={`${to <= 40 && !cls ? 'low' : ''} ${cls ?? ''}`} style={{ width: `${w}%` }} /></div>
}

function Card({ e, fresh }: { e: LogEntry; fresh: boolean }) {
  const d = e.data ?? {}
  if (e.kind === 'combat' && d.type === 'hp') {
    const max = d.max || Math.max(d.before, d.after, 1)
    const delta = d.after - d.before
    return (
      <div className={`card${d.after === 0 && d.before > 0 ? ' bad' : ''}`}>
        <div className="hprow">
          <span className="nm">{d.name}</span>
          <span className={`delta${delta > 0 ? ' up' : ''}`}>{delta === 0 ? '±0' : sgn(delta)} PV</span>
          <Bar from={(d.before / max) * 100} to={(d.after / max) * 100} animate={fresh} />
          <span className="hv">{d.after}/{max}</span>
        </div>
        {(d.sub || (d.after === 0 && d.before > 0)) && <div className="chiprow">{d.sub && <span className="rmeta">{d.sub}</span>}{d.after === 0 && d.before > 0 && <span className="pill">Caído</span>}</div>}
      </div>
    )
  }
  if (e.kind === 'combat' && d.type === 'turn') {
    return (
      <div className="card">
        <div className="rhead"><span className="big mono">{d.round}</span><span className="verd" style={{ color: 'var(--text)' }}>{d.name ? `Turno de ${d.name}` : 'Turno'}</span></div>
        {Array.isArray(d.order) && <div className="ord">{d.order.map((o: any, i: number) => <span key={i} className={o.state}>{o.name}</span>)}</div>}
        {d.newRound && <div className="rmeta">Nova rodada: todos voltam a poder agir.</div>}
      </div>
    )
  }
  if (e.kind === 'combat' && d.type === 'cond') return <div className="card"><div className="chiprow"><b>{d.name}</b><span className="pill">{d.on ? 'com' : 'sem'} {d.cond}</span></div></div>
  if (e.kind === 'combat') return <div className="card"><div><b>{e.text}</b></div></div>
  if (e.kind === 'roll' && d.type === 'roll') {
    const has = d.success !== undefined
    const tone = d.fumble ? 'bad' : has ? (d.success ? (d.critical ? 'crit' : 'ok') : 'bad') : d.critical ? 'crit' : ''
    const keptVals = (d.dice as any[]).filter((x) => x.kept).map((x) => x.value)
    const verd = d.fumble ? 'Falha crítica' : [d.critical ? 'Crítico' : '', has ? (d.success ? 'Sucesso' : 'Falha') + ' ' + sgn(d.margin) : ''].filter(Boolean).join(' · ') || 'Sem DT'
    const dropped = (d.dice as any[]).filter((x) => !x.kept)
    return (
      <div className={`card ${tone}`}>
        <div className="rhead"><span className="big mono">{d.total}</span><span className="verd">{verd}</span>{d.who && <span className="rmeta">{d.who}</span>}</div>
        <div className="dice">{(d.dice as any[]).map((x, i) => <span key={i} className={`dc ${!x.kept ? 'x' : d.critical && keptVals.filter((v) => v === x.value).length > 1 ? 'k' : ''}`} title={x.kept ? `d${x.sides}` : 'Descartado'}>{x.value}</span>)}</div>
        <div className="rmeta">
          {d.mode === 'pool' ? <>RA <b>{d.high}</b> · RB <b>{d.low}</b> · soma dos {keptVals.length} maiores{dropped.length ? <>, descartado <b>{dropped.map((x) => x.value).join(', ')}</b></> : null}</> : <>soma <b>{d.sum}</b></>}
          {d.modifier ? <> · mod <b>{sgn(d.modifier)}</b></> : null}
          {d.dt !== undefined ? <> · DT <b>{d.dt}</b>{d.label ? ` (${d.label})` : ''}</> : null}
        </div>
      </div>
    )
  }
  if (e.kind === 'scene' && d.type === 'scene') {
    return (
      <div className="card">
        <h3>{d.title}</h3>
        {d.read ? <p className="rd">{d.read}</p> : <div className="rmeta">Cena sem texto preparado.</div>}
        <div className="chiprow">{d.points > 0 && <span className="pill">{d.points} pontos de interesse</span>}{d.encounter && <span className="pill">Encontro: {d.encounter}</span>}</div>
      </div>
    )
  }
  if (e.kind === 'scene') return <div className="card"><div><b>{e.text}</b></div>{(d.info || d.scene) && <div className="rmeta">{[d.info, d.scene].filter(Boolean).join(' · ')}</div>}</div>
  if (e.kind === 'note') return <div className="card"><div style={{ whiteSpace: 'pre-wrap' }}>{e.text}</div><div className="rmeta">Nota salva</div></div>
  return <div className="sysl">{e.text}</div>
}

export default function LogPanel() {
  const ws = useWs()
  const cid = ws.campaignId
  const [rows, setRows] = useState<Row[]>([])
  const [filter, setFilter] = useState<LogKind | null>(null)
  const [value, setValue] = useState('')
  const [sel, setSel] = useState(0)
  const [off, setOff] = useState(false)
  const [busy, setBusy] = useState(false)
  const [round, setRound] = useState<number | null>(null)
  const [sceneId, setSceneId] = useState<number | null>(() => Number(lsGet(sceneKey(cid))) || null)
  const [targets, setTargets] = useState<{ combs: string[]; pcs: string[] }>({ combs: [], pcs: [] })
  const fresh = useRef(new Set<number>())
  const loaded = useRef(false)
  const box = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const hist = useRef<string[]>([])
  const hi = useRef(-1)
  const near = useRef(true)
  const loadTargetsRef = useRef<() => void>(() => {})

  useEffect(() => {
    loaded.current = false
    list<LogEntry>('log_entries', { campaign_id: cid }).then((r) => {
      setRows((cur) => [...r, ...cur.filter((x) => isLocal(x) || (x.id > (r[r.length - 1]?.id ?? 0)))])
      loaded.current = true
    }).catch(() => {})
    return onLog(({ type, entry }) => {
      if (entry.campaign_id !== cid) return
      if (type === 'add') { if (entry.kind === 'combat') loadTargetsRef.current(); fresh.current.add(entry.id); setRows((cur) => (cur.some((x) => x.id === entry.id) ? cur : [...cur, entry])) }
      else setRows((cur) => cur.map((x) => (x.id === entry.id ? entry : x)))
    })
  }, [cid])

  useEffect(() => { try { hist.current = JSON.parse(lsGet(`rpgtable:cmdhist:${cid}`) ?? '[]') } catch { hist.current = [] } }, [cid])

  const loadTargets = useCallback(async () => {
    const id = await activeEncounterId(cid).catch(() => null)
    list<{ id: number; round: number }>('encounters', { campaign_id: cid }).then((l) => setRound(id ? l.find((e) => e.id === id)?.round ?? null : null)).catch(() => {})
    const [combs, chars] = await Promise.all([
      id ? list<{ name: string }>('combatants', { encounter_id: id }).catch(() => []) : Promise.resolve([]),
      list<{ name: string; kind: string }>('characters', { campaign_id: cid }).catch(() => []),
    ])
    setTargets({ combs: combs.map((c) => c.name), pcs: chars.filter((c) => c.kind === 'pc').map((c) => c.name) })
  }, [cid])
  loadTargetsRef.current = loadTargets
  useEffect(() => { loadTargets(); return listen('rpgtable:combat-changed', loadTargets) }, [loadTargets])
  useEffect(() => { setSceneId(Number(lsGet(sceneKey(cid))) || null); return listen('rpgtable:scene', (d: { sceneId: number }) => setSceneId(d.sceneId)) }, [cid])

  useEffect(() => listen('rpgtable:focus-composer', (d?: { text?: string }) => {
    if (d?.text !== undefined) setValue(d.text)
    setTimeout(() => { input.current?.focus(); const n = input.current?.value.length ?? 0; input.current?.setSelectionRange(n, n) }, 0)
  }), [])

  useEffect(() => { const b = box.current; if (b && near.current) b.scrollTop = b.scrollHeight }, [rows, filter])

  const layoutNames = [...ws.layoutNames.presets, ...ws.layoutNames.saved]
  const sdata: SuggestData = useMemo(() => ({
    targets: targets.combs, pcs: targets.pcs, scenes: ws.items.scenes.map((s) => s.title), open: openables(ws.items).map((o) => o.label),
    layouts: layoutNames, conds: ws.system?.config.conditions ?? [],
  }), [targets, ws.items, ws.system, layoutNames.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
  const sg = useMemo(() => (off ? [] : suggest(value, sdata)), [value, sdata, off])

  const local = (text: string, tone: Local['tone'], usage?: string) =>
    setRows((r) => [...r, { id: `l${Date.now()}${Math.random()}`, tone, text, usage, t: new Date().toISOString() }])

  const send = async (text: string) => {
    const v = text.trim()
    if (!v || busy) return
    hist.current = [...hist.current.filter((x) => x !== v), v].slice(-50); hi.current = -1
    lsSet(`rpgtable:cmdhist:${cid}`, JSON.stringify(hist.current))
    setValue(''); setSel(0); setBusy(true); near.current = true
    try {
      const msg = await runCommand(v, { campaignId: cid, system: ws.system, items: ws.items, open: ws.open, preset: ws.preset, layoutNames })
      if (msg) local(msg, 'info')
      ws.reloadItems()
    } catch (e) {
      local((e as Error).message, 'bad', (e as any).usage)
    } finally { setBusy(false); loadTargets(); input.current?.focus() }
  }

  const onKey = (ev: React.KeyboardEvent) => {
    const open = sg.length > 0
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      if (open) { ev.preventDefault(); setSel((s) => (s + (ev.key === 'ArrowDown' ? 1 : -1) + sg.length) % sg.length); return }
      const h = hist.current
      if (ev.key === 'ArrowUp' && h.length) { ev.preventDefault(); hi.current = Math.min(hi.current + 1, h.length - 1); setValue(h[h.length - 1 - hi.current]); setOff(true) }
      else if (ev.key === 'ArrowDown' && hi.current >= 0) { ev.preventDefault(); hi.current--; setValue(hi.current < 0 ? '' : h[h.length - 1 - hi.current]); setOff(true) }
      return
    }
    if (ev.key === 'Tab' && open) { ev.preventDefault(); setValue(sg[sel].ins); setOff(false); return }
    if (ev.key === 'Enter') {
      ev.preventDefault()
      const s = open ? sg[sel] : undefined
      if (s?.cmd && value.trim() !== s.ins.trim()) { setValue(s.ins); return }
      send(value)
    }
    if (ev.key === 'Escape') { ev.preventDefault(); if (open) setOff(true); else if (value) setValue(''); else input.current?.blur() }
  }

  const m = value.match(/^\/(\S+)/)
  const hint = m ? COMMANDS[norm(m[1])]?.u ?? '' : ''
  const shown = rows.filter((r) => isLocal(r) || !filter || r.kind === filter)
  const sessLabel = (id: number | null) => {
    const s = ws.items.sessions.find((x) => x.id === id)
    return s ? `Sessão ${s.number ?? ''}${s.title ? ' — ' + s.title : ''}`.replace('Sessão  ', 'Sessão ') : 'Sem sessão'
  }
  const sceneTitle = (ws.items.scenes.find((s) => s.id === sceneId) ?? ws.items.scenes[0])?.title
  const multi = rows.some((r) => !isLocal(r) && r.session_id != null)
  let lastSess: number | null | undefined = undefined

  return (
    <div className="log">
      <div className="shead">
        <span className="ctx" title="Contexto do registro"><b>{ws.campaign?.name ?? 'Campanha'}</b>{sceneTitle && <><i>·</i><span className="ctx-s">{sceneTitle}</span></>}{round != null && <><i>·</i><span>rodada <span className="mono">{round}</span></span></>}</span>
        <span className="sp" />
        <button className="btn sm ghost" onClick={() => emit('rpgtable:help')} title="Atalhos de teclado (?)">Atalhos <kbd>?</kbd></button>
      </div>
      <div className="shead sub">
        <div className="seg" role="tablist" aria-label="Filtro">
          {FILTERS.map(([l, k]) => <button key={l} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>)}
        </div>
      </div>
      <div className="stream" ref={box} onScroll={(e) => { const b = e.currentTarget; near.current = b.scrollHeight - b.scrollTop - b.clientHeight < 80 }}>
        {!shown.length && <div className="empty">Nada registrado ainda. Digite <span className="mono">/</span> para ver os comandos, ou escreva uma nota.</div>}
        {shown.map((r) => {
          if (isLocal(r)) return (
            <article className="ev" key={r.id}><time>{hhmm(r.t)}</time><div>
              {r.tone === 'bad' ? <div className="card bad"><b>{r.text}</b>{r.usage && <div className="rmeta mono">{r.usage}</div>}</div> : <div className="sysl" style={{ whiteSpace: 'pre-wrap' }}>{r.text}</div>}
            </div></article>
          )
          const head = multi && r.session_id !== lastSess ? <div className="shdr" key={`h${r.id}`}>{sessLabel(r.session_id)}</div> : null
          lastSess = r.session_id
          const d = r.data ?? {}
          return (
            <div key={r.id}>
              {head}
              <article className={`ev${d.undone ? ' undone' : ''}`}>
                <time>{hhmm(r.created_at)}</time>
                <div>
                  {(d.cmd || d.via) && <div className="cmd">{d.cmd && <><span className="pr">›</span><span>{d.cmd}</span></>}{d.via && <span className="via">via {d.via}</span>}</div>}
                  <Card e={r} fresh={fresh.current.has(r.id)} />
                  {d.undone && <div className="rmeta">Desfeito</div>}
                </div>
              </article>
            </div>
          )
        })}
      </div>
      <div className="comp-w">
        {sg.length > 0 && <div className="sg" role="listbox">{sg.map((s, i) => (
          <button key={s.ins} className={`sgi${i === sel ? ' sel' : ''}`} role="option" aria-selected={i === sel} onMouseDown={(e) => { e.preventDefault(); setValue(s.ins); setOff(false); input.current?.focus() }}>
            <span className="a">{s.a}</span><span className="d">{s.d}</span>
          </button>
        ))}</div>}
        <div className="comp">
          <span className="pr">›</span>
          <input ref={input} value={value} placeholder="Digite / para comandos, ou escreva uma nota" aria-label="Composer" spellCheck={false} autoComplete="off"
            onChange={(e) => { setValue(e.target.value); setSel(0); setOff(false); hi.current = -1 }} onKeyDown={onKey} onFocus={loadTargets} />
          <kbd>Enter</kbd>
        </div>
        <div className="chips">
          {['/dano ', '/cura ', '/turno', '/rolar ', '/cena ', '/nota '].map((c) => <button key={c} onClick={() => (c.endsWith(' ') ? (setValue(c), input.current?.focus()) : send(c))}>{c.trim()}</button>)}
          <span className="hint">{hint}</span>
        </div>
      </div>
    </div>
  )
}
