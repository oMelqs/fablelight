import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { create, list, postJson, remove } from '../api'
import { CreatureEditor, TIERS, type Creature } from '../components/library/CreatureEditor'
import '../components/editor/ed.css'
import type { System } from '../../shared/types'
import { Chip, Empty, LIcon, scopeName, typing, useCampaigns } from '../library/ui'
import '../library/library.css'
import { notifyItems } from '../workspace/data'

type Sort = 'name' | 'tier' | 'hp' | 'armor'
const tags = (c: Creature) => (c.tags ?? '').split(/[,·]/).map((t) => t.trim()).filter(Boolean)
const fmt = (v: number | undefined, pool: boolean) => (v ? (pool ? `d${v}` : String(v)) : '—')

export default function Bestiario({ initialId, campaignId: cid }: { initialId?: number; campaignId?: number } = {}) {
  const [params] = useSearchParams()
  const campaignId = cid ?? (params.get('campaign') ? Number(params.get('campaign')) : null)
  const camps = useCampaigns()
  const [systems, setSystems] = useState<System[]>([])
  const [systemId, setSystemId] = useState<number>()
  const [all, setAll] = useState<Creature[]>([])
  const [scope, setScope] = useState<'all' | 'lib' | number>(campaignId ?? 'all')
  const [tiers, setTiers] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ k: Sort; dir: 1 | -1 }>({ k: 'name', dir: 1 })
  const [sel, setSel] = useState<number | undefined>(initialId)
  const [target, setTarget] = useState<number | undefined>(campaignId ?? undefined)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')

  const load = () => list<Creature>('creatures').then(setAll).catch((e) => setErr(e.message))
  useEffect(() => { load(); list<System>('systems').then(setSystems).catch((e) => setErr(e.message)) }, [])
  useEffect(() => {
    if (systemId || !systems.length) return
    const c = camps.find((x) => x.id === campaignId)
    setSystemId(c?.system_id ?? systems[0].id)
  }, [systems, camps, systemId, campaignId])
  useEffect(() => { if (!target && camps.length) setTarget(camps[0].id) }, [camps, target])
  useEffect(() => { if (initialId && all.length) { const c = all.find((x) => x.id === initialId); if (c) { setSystemId(c.system_id); setScope('all') } } }, [all.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const system = systems.find((s) => s.id === systemId)
  const cfg = system?.config
  const pool = cfg?.roll?.mode === 'pool'
  const attrs = (cfg?.attributes ?? []).slice(0, 5)
  const rank = (t: string | null) => { const i = TIERS.indexOf(t ?? ''); return i < 0 ? 99 : i }

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase()
    const r = all.filter((c) => c.system_id === systemId
      && (scope === 'all' || (scope === 'lib' ? c.campaign_id == null : c.campaign_id === scope))
      && (!tiers.length || tiers.includes(c.tier ?? ''))
      && (!n || `${c.name} ${c.tags ?? ''} ${c.tier ?? ''}`.toLowerCase().includes(n)))
    const v = (c: Creature) => sort.k === 'name' ? c.name.toLowerCase() : sort.k === 'tier' ? rank(c.tier) : sort.k === 'hp' ? c.stats?.hp ?? 0 : c.stats?.armor ?? 0
    return r.sort((a, b) => (v(a) < v(b) ? -1 : v(a) > v(b) ? 1 : 0) * sort.dir)
  }, [all, systemId, scope, tiers, q, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  const current = all.find((r) => r.id === sel)
  const sys = (id: number) => systems.find((s) => s.id === id)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey) return
      if (e.key === '/') { e.preventDefault(); document.getElementById('lb-bq')?.focus() }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      e.preventDefault()
      const i = rows.findIndex((r) => r.id === sel)
      const n = rows[Math.max(0, Math.min(rows.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]
      if (n) { setSel(n.id); document.querySelector(`[data-cr="${n.id}"]`)?.scrollIntoView({ block: 'nearest' }) }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  })

  const add = async () => {
    if (!systemId) return
    const camp = typeof scope === 'number' ? scope : null
    try { const c = await create<Creature>('creatures', { name: 'Nova criatura', system_id: systemId, campaign_id: camp, stats: {} }); await load(); setSel(c.id); notifyItems() } catch (e) { setErr((e as Error).message) }
  }
  const del = async () => {
    if (!current) return
    try { await remove('creatures', current.id); setSel(undefined); await load(); notifyItems() } catch (e) { setErr((e as Error).message) }
  }
  const copy = async () => {
    if (!current || !target) return
    try { await postJson(`/api/campaigns/${target}/duplicate-creature/${current.id}`); setNote(`Copiada para ${scopeName(camps, target)}. A cópia é independente.`); await load(); notifyItems() } catch (e) { setErr((e as Error).message) }
  }
  const th = (k: Sort, label: string, cls = '') => (
    <th className={cls} aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
      <button className={sort.k === k ? 'on' : ''} onClick={() => setSort((s) => ({ k, dir: s.k === k ? (-s.dir as 1 | -1) : 1 }))}>{label}{sort.k === k && <LIcon name={sort.dir === 1 ? 'down' : 'up'} size={11} />}</button>
    </th>
  )

  return (
    <div className="lb">
      <div className="lb-tb">
        <h2>Bestiário</h2>
        <select className="input" style={{ width: 130 }} aria-label="Sistema" value={systemId ?? ''} onChange={(e) => { setSystemId(Number(e.target.value)); setSel(undefined) }}>
          {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input" style={{ width: 140 }} aria-label="Escopo" value={String(scope)} onChange={(e) => { const v = e.target.value; setScope(v === 'all' || v === 'lib' ? v : Number(v)) }}>
          <option value="all">Todos os escopos</option><option value="lib">Biblioteca</option>
          {camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input id="lb-bq" className="input" style={{ width: 150 }} type="search" placeholder="Filtrar criaturas…  /" aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="lb-row wrap" role="group" aria-label="Nível">
          {TIERS.map((t) => <Chip key={t} on={tiers.includes(t)} onClick={() => setTiers((a) => (a.includes(t) ? a.filter((x) => x !== t) : [...a, t]))}>{t}</Chip>)}
        </div>
        <span className="lb-faint mono" style={{ fontSize: 12, marginLeft: "auto" }}>{rows.length} de {all.filter((c) => c.system_id === systemId).length}</span>
        <button className="btn btn-primary" onClick={add}><LIcon name="plus" size={13} />Nova criatura</button>
      </div>
      {err && <div className="error lb-err" role="alert">{err}</div>}
      <div className="lb-split b">
        <div className="lb-scroll">
          <table className="lb-tbl">
            <thead><tr>
              {th('name', 'Nome')}{th('tier', 'Nível')}<th>Tags</th>
              {th('hp', 'PV', 'num')}{th('armor', 'Armadura', 'num')}<th className="num">Dano</th>
              {attrs.map((a) => <th key={a.key} className="num" title={a.label}>{a.label.slice(0, 3)}</th>)}
              <th style={{ width: 34 }} />
            </tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} data-cr={c.id} className={`lr${c.id === sel ? ' sel' : ''}`} tabIndex={0} aria-selected={c.id === sel}
                  onClick={() => setSel(c.id)} onKeyDown={(e) => { if (e.key === 'Enter') setSel(c.id) }}>
                  <td className="name"><span className="lb-av">{c.name[0]}</span>{c.name}</td>
                  <td className="lb-tier">{c.tier ?? ''}</td>
                  <td className="tags">{tags(c).slice(0, 2).map((t) => <span key={t} className="lb-chip sm" style={{ marginRight: 4 }}>{t}</span>)}</td>
                  <td className="num">{c.stats?.hp ?? '—'}</td><td className="num">{c.stats?.armor ?? '—'}</td><td className="num dmg" title={c.stats?.damage}>{c.stats?.damage || '—'}</td>
                  {attrs.map((a) => <td key={a.key} className="num">{fmt(c.stats?.attributes?.[a.key], pool)}</td>)}
                  <td title={scopeName(camps, c.campaign_id)} style={{ color: 'var(--acl)' }}>{c.campaign_id != null && <LIcon name="campaigns" size={14} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (all.length
            ? <Empty icon="bestiary" title="Nenhuma criatura neste filtro"><p>Ajuste os filtros ou crie uma criatura.</p></Empty>
            : <Empty icon="bestiary" title="Nenhuma criatura ainda"><p>Crie a primeira criatura do sistema.</p><button className="btn btn-primary" onClick={add}><LIcon name="plus" size={13} />Nova criatura</button></Empty>)}
        </div>
        <aside className="lb-insp" aria-label="Ficha">
          {!current || !sys(current.system_id)
            ? <div className="lb-pad lb-faint" style={{ paddingTop: 60, textAlign: 'center' }}>Selecione uma criatura para ver a ficha. Use ↑ ↓ na lista.</div>
            : <>
              <div className="lb-insp-strip">
                <span className="lb-pill">{scopeName(camps, current.campaign_id)}</span>
                {current.campaign_id == null && camps.length > 0 && <>
                  <select className="input" aria-label="Campanha de destino" value={target ?? ''} onChange={(e) => setTarget(Number(e.target.value))}>
                    {camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button className="btn" onClick={copy}><LIcon name="copy" size={14} />Copiar para a campanha</button>
                </>}
                {note && <span className="lb-pill ok" aria-live="polite">{note}</span>}
              </div>
              <CreatureEditor key={current.id} creature={current} config={sys(current.system_id)!.config} onDelete={del} onSaved={load}
                scopeLabel={current.campaign_id ? 'Campanha' : 'Biblioteca'} />
            </>}
        </aside>
      </div>
    </div>
  )
}
