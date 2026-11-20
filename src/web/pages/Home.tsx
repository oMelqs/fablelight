import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getJson, list, remove, update } from '../api'
import type { Campaign, HubSummary, System } from '../../shared/types'
import { Del } from '../components/editor/ed'
import Icon from '../components/Icon'
import CampaignCard from '../hub/CampaignCard'
import CampaignCover, { coverOf } from '../hub/CampaignCover'
import { daysAgo } from '../hub/format'
import { sceneKey } from '../workspace/log'
import { lsGet } from '../workspace/util'
import '../components/editor/ed.css'
import '../hub/hub.css'

const typing = (t: EventTarget | null) => t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)

export default function Home() {
  const nav = useNavigate()
  const [camps, setCamps] = useState<Campaign[] | null>(null)
  const [systems, setSystems] = useState<System[]>([])
  const [sums, setSums] = useState<Record<number, HubSummary>>({})
  const [q, setQ] = useState('')
  const [renaming, setRenaming] = useState<number | null>(null)
  const [err, setErr] = useState('')
  const grid = useRef<HTMLDivElement>(null)

  const load = () => {
    list<Campaign>('campaigns').then(setCamps, (e) => setErr(e.message))
    list<System>('systems').then(setSystems, () => {})
    getJson<HubSummary[]>('/api/hub').then((r) => setSums(Object.fromEntries(r.map((s) => [s.id, s]))), () => {})
  }
  useEffect(load, [])

  const { active, archived } = useMemo(() => ({
    active: (camps ?? []).filter((c) => !c.config?.archived),
    archived: (camps ?? []).filter((c) => c.config?.archived),
  }), [camps])
  // Most recent: latest played, falling back to creation date.
  const recent = useMemo(() => [...active].sort((a, b) =>
    (sums[b.id]?.last_played ?? b.created_at).localeCompare(sums[a.id]?.last_played ?? a.created_at))[0], [active, sums])
  const [scene, setScene] = useState<string | null>(null)
  useEffect(() => {
    const id = recent && lsGet(sceneKey(recent.id))
    setScene(null)
    if (id) getJson<{ title: string }>(`/api/scenes/${id}`).then((s) => setScene(s.title), () => {})
  }, [recent?.id])
  const shown = active.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()))
  const sys = (id: number) => systems.find((s) => s.id === id)

  const patch = (c: Campaign, config: Campaign['config'], extra: Record<string, unknown> = {}) =>
    update('campaigns', c.id, { ...extra, config: { ...c.config, ...config } }).then(load, (e) => setErr(e.message))
  const archive = (c: Campaign, on: boolean) => patch(c, { archived: on || undefined })
  const del = (c: Campaign) => remove('campaigns', c.id).then(load, (e) => setErr(e.message))

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); nav('/nova-campanha') }
      else if (e.key === 'Enter' && recent && document.activeElement === document.body) nav(`/c/${recent.id}`)
    }
    addEventListener('keydown', h)
    return () => removeEventListener('keydown', h)
  }, [nav, recent])

  const moveFocus = (e: React.KeyboardEvent, id: number) => {
    if (typing(e.target)) return
    if (e.key === 'Enter') { nav(`/c/${id}`); return }
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!d) return
    e.preventDefault()
    const els = [...(grid.current?.querySelectorAll<HTMLElement>('[data-card]') ?? [])]
    els[els.indexOf(e.currentTarget as HTMLElement) + d]?.focus()
  }

  if (!camps) return <div className="ed" style={{ flex: 1 }}>{err && <div className="ed-err">{err}</div>}</div>

  if (!camps.length) return (
    <div className="hub"><div className="hub-empty">
      <div className="hub-lant"><svg width="44" height="44" viewBox="9 2 14 26" aria-hidden="true">
        <g fill="none" stroke="var(--dim)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 7.5V6.5a2.5 2.5 0 0 1 5 0v1" /><path d="M9.5 12 12.5 7.5h7l3 4.5Z" /><path d="M11.5 12v12M20.5 12v12M9 24.5h14" /></g>
        <path fill="var(--ac)" d="M16 14.2c1.9 1.9 2.8 3.3 2.8 4.6a2.8 2.8 0 0 1-5.6 0c0-1.3.9-2.7 2.8-4.6Z" /></svg></div>
      <h1 className="hub-t">Sua mesa ainda está apagada</h1>
      <p className="dim hub-lead">Crie a primeira campanha. Livros e áudio podem vir depois: tudo fica no seu computador.</p>
      <Link className="btn btn-primary hub-big" to="/nova-campanha"><Icon name="plus" size={14} />Criar campanha<kbd>N</kbd></Link>
      <div className="hub-steps">
        {[['01', 'Escolha um sistema', 'Núcleo d4–d12 e D20 genérico já vêm instalados. Ou monte o seu.'],
          ['02', 'Traga seus livros', 'Importe PDF ou Markdown. Tudo é indexado para busca na mesa.'],
          ['03', 'Monte a trilha', 'Arquivos ou links do YouTube, com volume e loop salvos por faixa.']].map(([n, t, d]) =>
          <div className="hub-step" key={n}><span className="mono faint">{n}</span><h4>{t}</h4><p className="dim">{d}</p></div>)}
      </div>
    </div></div>
  )

  const rs = recent && sums[recent.id]
  const resumeLine = rs?.last_session ? `Sessão ${rs.last_session.number ?? ''}${rs.last_session.title ? ' — ' + rs.last_session.title : ''}`.trim()
    : rs?.next_session?.title ?? recent?.description ?? ''

  return (
    <div className="hub"><div className="hub-in">
      <header className="hub-head">
        <div>
          <h1 className="hub-t">Campanhas</h1>
          <p className="dim" style={{ marginTop: 4 }}>{active.length} {active.length === 1 ? 'ativa' : 'ativas'} · {archived.length} {archived.length === 1 ? 'arquivada' : 'arquivadas'}</p>
        </div>
        <span style={{ flex: 1 }} />
        <input className="input hub-filter" aria-label="Filtrar campanhas" placeholder="Filtrar campanhas…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Link className="btn btn-primary" to="/nova-campanha"><Icon name="plus" size={14} />Nova campanha<kbd>N</kbd></Link>
      </header>
      {err && <div className="ed-err">{err}</div>}

      {recent && !q && (
        <section className="hub-resume">
          <div className="hub-resume-cv"><CampaignCover {...coverOf(recent)} name={recent.name} /></div>
          <div className="hub-resume-b">
            <span className="lbl">Retomar</span>
            <h2>{recent.name}</h2>
            {resumeLine && <p className="dim">{resumeLine}</p>}
            {scene && <p className="dim"><Icon name="scene" size={14} /> Cena em jogo: {scene}</p>}
            <div className="hub-resume-r">
              <Link className="btn btn-primary" to={`/c/${recent.id}`}><Icon name="play" size={14} />Entrar na mesa<kbd>↵</kbd></Link>
              <span className="faint">{rs?.last_played ? `Última mesa ${daysAgo(rs.last_played)} · ` : ''}{sys(recent.system_id)?.name}</span>
            </div>
          </div>
        </section>
      )}

      <div className="hub-grid" ref={grid}>
        {shown.map((c, i) => (
          <article key={c.id} className="cc" tabIndex={0} data-card style={{ animationDelay: `${i * 60}ms` }}
            onKeyDown={(e) => moveFocus(e, c.id)}
            onClick={(e) => { if (renaming !== c.id && !(e.target as HTMLElement).closest('button,input')) nav(`/c/${c.id}`) }}>
            <CampaignCard c={c} system={sys(c.system_id)} sum={sums[c.id]}
              title={renaming === c.id
                ? <input className="input cc-rename" aria-label="Novo nome" autoFocus defaultValue={c.name}
                    onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') setRenaming(null) }}
                    onBlur={(e) => { const v = e.target.value.trim(); setRenaming(null); if (v && v !== c.name) update('campaigns', c.id, { name: v }).then(load, (x) => setErr(x.message)) }} />
                : undefined}
              actions={<>
                <button className="btn btn-sm" title="Renomear" aria-label="Renomear" onClick={() => setRenaming(c.id)}><Icon name="pencil" size={14} /></button>
                <button className="btn btn-sm" title="Arquivar" aria-label="Arquivar" onClick={() => archive(c, true)}><Icon name="explorer" size={14} /></button>
              </>} />
          </article>
        ))}
        {!q && <Link className="cc newc" to="/nova-campanha" style={{ animationDelay: `${shown.length * 60}ms` }}>
          <span className="plus"><Icon name="plus" size={20} /></span>Nova campanha
          <span className="faint" style={{ fontWeight: 400, fontSize: 12 }}>nome, sistema e capa em um passo</span>
        </Link>}
        {q && !shown.length && <div className="ed-empty" style={{ gridColumn: '1 / -1' }}>Nenhuma campanha com “{q}”.</div>}
      </div>

      {!!archived.length && (
        <details className="hub-arch">
          <summary><Icon name="chevron" size={14} />Arquivadas <span className="mono faint">{archived.length}</span></summary>
          {archived.map((c) => (
            <div className="hub-arow" key={c.id}>
              <div className="hub-mini"><CampaignCover {...coverOf(c)} name={c.name} initial={false} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{c.name}</b>
                <div className="faint">{sys(c.system_id)?.name} · {sums[c.id]?.sessions ?? 0} sessões</div>
              </div>
              <button className="btn btn-sm" onClick={() => archive(c, false)}>Restaurar</button>
              <Link className="btn btn-sm btn-ghost" to={`/c/${c.id}`}>Abrir</Link>
              <Del label="Apagar" ask="Apagar tudo da campanha" onYes={() => del(c)} />
            </div>
          ))}
        </details>
      )}
    </div></div>
  )
}
