import { useCallback, useEffect, useState } from 'react'
import { create, get, list, postJson, remove, update } from '../../api'
import { Pips, allTracks, type Character } from '../combat/CharacterSheet'
import type { Campaign, System } from '../../../shared/types'
import '../combat/combat.css'
import Icon from '../Icon'
import { combatChanged, logEvent, setActiveEncounter } from '../../workspace/log'
import { confirmDialog, listen, norm } from '../../workspace/util'
import './session.css'

interface Enc { id: number; name: string; round: number; active_id: number | null }
interface Comb { id: number; encounter_id: number; ord: number; name: string; hp_cur: number; hp_max: number; armor: number; conditions: string[]; acted: number; hidden: number }
interface Creature { id: number; name: string; campaign_id: number | null; tier: string | null }

const short = (n: string) => { const m = n.trim().match(/^(\S)\S*\s+(\d+)$/); return m ? m[1].toUpperCase() + m[2] : n.trim().slice(0, 3) }

function Row({ c, active, sel, first, last, conditions, patch, move, del, onSel }: {
  c: Comb; active: boolean; sel: boolean; first: boolean; last: boolean; conditions: string[]
  patch: (p: Partial<Comb>) => void; move: (d: -1 | 1) => void; del: () => void; onSel: () => void
}) {
  const [n, setN] = useState('')
  const [sure, setSure] = useState(false)
  useEffect(() => { if (!sel) { setN(''); setSure(false) } }, [sel])
  const setHp = (v: number) => patch({ hp_cur: Math.max(0, c.hp_max ? Math.min(c.hp_max, v) : v) })
  const amount = Number(n) || 0
  const pct = c.hp_max ? Math.max(0, Math.min(100, (c.hp_cur / c.hp_max) * 100)) : 0
  const dano = () => { if (amount) { setHp(c.hp_cur - Math.max(1, amount - c.armor)); setN('') } }
  const perda = () => { if (amount) { setHp(c.hp_cur - amount); setN('') } }
  const cura = () => { if (amount) { setHp(c.hp_cur + amount); setN('') } }
  const free = conditions.filter((x) => !c.conditions.includes(x))
  return (
    <div className={`cx-row${active ? ' active' : ''}${sel ? ' sel' : ''}${c.acted ? ' acted' : ''}${c.hidden ? ' hid' : ''}`}>
      <div className="cx-top">
      <div className="cx-main" role="button" tabIndex={0} aria-pressed={sel} onClick={onSel} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSel() } }}>
        <span className="cx-name" title={c.name}>{c.hidden ? <Icon name="eyeOff" size={12} /> : null}{c.name}</span>
        {c.armor > 0 && <span className="cx-ar mono" title="Armadura">A{c.armor}</span>}
        <div className={`cx-hp${pct <= 25 ? ' low' : ''}`}><i style={{ transform: `scaleX(${pct / 100})` }} /></div>
        <span className="cx-num mono">{c.hp_cur}<small>/{c.hp_max}</small></span>
        {c.conditions.length > 0 && <div className="cx-pills">{c.conditions.map((x) => <span className="cx-pill" key={x}>{x}</span>)}</div>}
      </div>
      <div className="cx-q">
        {[-5, -1, 1].map((d) => <button key={d} className="btn sm mono cx-qb" disabled={d < 0 ? c.hp_cur <= 0 : !!c.hp_max && c.hp_cur >= c.hp_max} aria-label={`${d > 0 ? '+' : '−'}${Math.abs(d)} PV em ${c.name}`} title={`${d > 0 ? 'Cura' : 'Perda direta'} de ${Math.abs(d)} PV`} onClick={() => setHp(c.hp_cur + d)}>{d > 0 ? '+' : '−'}{Math.abs(d)}</button>)}
      </div>
      </div>
      {sel && (
        <div className="cx-strip">
          <div className="cx-act">
            <input className="inp cx-amt" type="number" min={0} autoFocus value={n} placeholder="valor" aria-label="Quantidade" onChange={(e) => setN(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? cura() : e.altKey ? perda() : dano() } }} />
            <button className="btn sm cx-dmg" disabled={!amount} title="Dano (Enter): aplica a armadura, mínimo 1" onClick={dano}><Icon name="damage" size={13} />Dano</button>
            <button className="btn sm cx-dmg" disabled={!amount} title="Perda direta (⌥Enter): ignora a armadura" onClick={perda}>Perda</button>
            <button className="btn sm cx-heal" disabled={!amount} title="Cura (⇧Enter)" onClick={cura}><Icon name="heal" size={13} />Cura</button>
            <span className="cx-hint">Enter dano · ⌥Enter perda · ⇧Enter cura</span>
          </div>
          <div className="cx-act">
            {c.conditions.map((x) => <span className="cx-pill rm" key={x}>{x}<button onClick={() => patch({ conditions: c.conditions.filter((y) => y !== x) })} title="Remover condição" aria-label={`Remover ${x}`}><Icon name="x" size={10} /></button></span>)}
            {free.length > 0 && (
              <select className="cx-sel" value="" aria-label="Adicionar condição" onChange={(e) => e.target.value && patch({ conditions: [...c.conditions, e.target.value] })}>
                <option value="">+ condição</option>
                {free.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            )}
            <span className="spacer" />
            <button className={`btn ico sm ghost${c.acted ? ' on' : ''}`} aria-pressed={!!c.acted} onClick={() => patch({ acted: c.acted ? 0 : 1 })} title={c.acted ? 'Já agiu — desmarcar' : 'Marcar como já agiu'}><Icon name="check" size={14} /></button>
            <button className={`btn ico sm ghost${c.hidden ? ' on' : ''}`} aria-pressed={!!c.hidden} onClick={() => patch({ hidden: c.hidden ? 0 : 1 })} title={c.hidden ? 'Oculto dos jogadores — mostrar' : 'Visível — ocultar'}><Icon name={c.hidden ? 'eyeOff' : 'eye'} size={14} /></button>
            <button className="btn ico sm ghost" disabled={first} onClick={() => move(-1)} title="Subir na ordem"><Icon name="up" size={14} /></button>
            <button className="btn ico sm ghost" disabled={last} onClick={() => move(1)} title="Descer na ordem"><Icon name="down" size={14} /></button>
            {sure
              ? <button className="btn sm btn-danger" onClick={del} onBlur={() => setSure(false)} autoFocus>Remover?</button>
              : <button className="btn ico sm ghost" onClick={() => setSure(true)} title="Remover do combate"><Icon name="trash" size={14} /></button>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CombatColumn({ campaignId, encounterId }: { campaignId: number; encounterId?: number }) {
  const [campaign, setCampaign] = useState<Campaign>()
  const [system, setSystem] = useState<System>()
  const [encs, setEncs] = useState<Enc[]>([])
  const [encId, setEncId] = useState<number | undefined>(encounterId)
  const pinned = encounterId !== undefined
  const [combs, setCombs] = useState<Comb[]>([])
  const [chars, setChars] = useState<Character[]>([])
  const [creatures, setCreatures] = useState<Creature[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [q, setQ] = useState('')
  const [count, setCount] = useState(1)
  const [newing, setNewing] = useState(false)
  const [err, setErr] = useState('')
  const fail = (e: Error) => setErr(e.message)

  const enc = encs.find((e) => e.id === encId)

  useEffect(() => {
    get<Campaign>('campaigns', campaignId).then((c) => { setCampaign(c); return get<System>('systems', c.system_id) }).then(setSystem).catch(fail)
    list<Creature>('creatures', { campaign_id: campaignId, library: true }).then(setCreatures).catch(fail)
  }, [campaignId])

  const refresh = useCallback(() => {
    list<Enc>('encounters', { campaign_id: campaignId }).then((l) => { setEncs(l); setEncId((id) => (id && l.some((e) => e.id === id) ? id : pinned ? undefined : l[l.length - 1]?.id)) }).catch(fail)
    list<Character>('characters', { campaign_id: campaignId }).then(setChars).catch(fail)
  }, [campaignId, pinned])
  const refreshCombs = useCallback(() => {
    if (encId) list<Comb>('combatants', { encounter_id: encId }).then(setCombs).catch(fail)
    else setCombs([])
  }, [encId])
  useEffect(() => {
    const h = (e: Event) => { const id = Number((e as CustomEvent).detail?.encounterId); if (id) { setEncId(id); refresh() } }
    window.addEventListener('rpgtable:open-encounter', h)
    return () => window.removeEventListener('rpgtable:open-encounter', h)
  }, [refresh])
  useEffect(refresh, [refresh])
  useEffect(() => { if (encId && !pinned) setActiveEncounter(campaignId, encId) }, [encId, pinned, campaignId])
  useEffect(() => listen('rpgtable:combat-changed', () => { refresh(); refreshCombs() }), [refresh, refreshCombs])
  useEffect(refreshCombs, [refreshCombs])
  useEffect(() => { const t = setInterval(() => { refresh(); refreshCombs() }, 5000); return () => clearInterval(t) }, [refresh, refreshCombs])

  const applyState = (r: { encounter: Enc; combatants: Comb[] }) => {
    setEncs((l) => l.map((e) => (e.id === r.encounter.id ? r.encounter : e))); setCombs(r.combatants)
  }
  const act = (path: string, body?: unknown) => postJson(`/api/encounters/${encId}/${path}`, body).then((r: { encounter: Enc; combatants: Comb[] }) => {
    applyState(r)
    if (path === 'next') {
      const cur = r.combatants.find((x) => x.id === r.encounter.active_id)
      logEvent('combat', cur ? `Turno de ${cur.name}` : 'Turno', {
        type: 'turn', round: r.encounter.round, name: cur?.name, newRound: !!enc && r.encounter.round > enc.round, via: 'Combate',
        order: r.combatants.map((x) => ({ name: x.name, state: x.id === r.encounter.active_id ? 'a' : x.hidden || x.acted ? 'd' : '' })),
      })
    }
  }).catch(fail)

  const [newName, setNewName] = useState('')
  const newEnc = async () => {
    const name = newName.trim() || `Encontro ${encs.length + 1}`
    setNewName(''); setNewing(false)
    try { const e = await create<Enc>('encounters', { campaign_id: campaignId, name }); setEncs((l) => [...l, e]); setEncId(e.id) } catch (e) { fail(e as Error) }
  }
  const delEnc = async () => {
    if (!enc || !(await confirmDialog(`Apagar encontro "${enc.name}"?`, { danger: true, okLabel: 'Apagar' }))) return
    await remove('encounters', enc.id).catch(fail); setEncId(undefined); refresh()
  }
  const setRound = (round: number) => {
    if (!enc || round < 1 || round === enc.round) return
    const before = enc.round
    setEncs((l) => l.map((e) => (e.id === enc.id ? { ...e, round } : e)))
    update('encounters', enc.id, { round }).then(() => { combatChanged(); return logEvent('combat', `Rodada ${round}`, { type: 'round', round, before, via: 'Combate' }) }).catch((e) => { fail(e); refresh() })
  }
  const patchComb = (c: Comb, p: Partial<Comb>) => {
    setCombs((l) => l.map((x) => (x.id === c.id ? { ...x, ...p } : x)))
    update('combatants', c.id, p).then(() => {
      if (p.hp_cur !== undefined && p.hp_cur !== c.hp_cur)
        logEvent('combat', `${c.name} ${p.hp_cur - c.hp_cur > 0 ? '+' : '−'}${Math.abs(p.hp_cur - c.hp_cur)} PV`, {
          type: 'hp', name: c.name, combatant_id: c.id, before: c.hp_cur, after: p.hp_cur, max: c.hp_max, via: 'Combate', undo: { combatant_id: c.id, hp_cur: c.hp_cur },
        })
    }).catch((e) => { fail(e); refreshCombs() })
  }
  const move = (i: number, d: -1 | 1) => {
    const a = combs[i], b = combs[i + d]
    if (!b) return
    const next = [...combs]; next[i] = { ...b, ord: a.ord }; next[i + d] = { ...a, ord: b.ord }
    setCombs(next.sort((x, y) => x.ord - y.ord || x.id - y.id))
    Promise.all([update('combatants', a.id, { ord: b.ord }), update('combatants', b.id, { ord: a.ord })]).catch((e) => { fail(e); refreshCombs() })
  }
  const addCombatant = (k: 'c' | 'k', id: number) => {
    if (!encId) return
    act('add', { [k === 'c' ? 'character_id' : 'creature_id']: id, count })
  }
  const patchChar = (ch: Character, data: Character['data']) => {
    setChars((l) => l.map((x) => (x.id === ch.id ? { ...x, data } : x)))
    update('characters', ch.id, { data }).catch((e) => { fail(e); refresh() })
  }

  const cfg = system?.config
  const pcs = chars.filter((c) => c.kind === 'pc')
  const match = (n: string) => norm(n).includes(norm(q.trim()))
  const menu: { label: string; k: 'c' | 'k'; items: { id: number; name: string }[] }[] = [
    { label: 'PJs', k: 'c', items: pcs.filter((p) => match(p.name)) },
    { label: 'Criaturas da campanha', k: 'k', items: creatures.filter((c) => c.campaign_id && match(c.name)) },
    { label: 'Biblioteca', k: 'k', items: creatures.filter((c) => !c.campaign_id && match(c.name)) },
  ]

  return (
    <div className="sx cx">
      <div className="sx-head">
        <select className="cx-enc" aria-label="Encontro" value={encId ?? ''} onChange={(e) => setEncId(Number(e.target.value))}>
          {!encs.length && <option value="">Sem encontros</option>}
          {encs.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        {enc && <span className="cx-round" role="group" aria-label="Rodada">
          <button aria-label="Rodada anterior" disabled={enc.round <= 1} onClick={() => setRound(enc.round - 1)}>–</button>
          <span>Rodada <b className="mono">{enc.round}</b></span>
          <button aria-label="Próxima rodada" onClick={() => setRound(enc.round + 1)}>+</button>
        </span>}
        <button className="btn ico sm ghost" title="Novo encontro" aria-label="Novo encontro" onClick={() => setNewing((v) => !v)}><Icon name="plus" size={14} /></button>
        {enc && <button className="btn ico sm ghost" title="Apagar encontro" aria-label="Apagar encontro" onClick={delEnc}><Icon name="trash" size={14} /></button>}
      </div>
      {newing && <div className="sx-head"><input className="inp" autoFocus placeholder="Nome do novo encontro" value={newName} onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') newEnc(); if (e.key === 'Escape') setNewing(false) }} /><button className="btn sm pri" onClick={newEnc}>Criar</button></div>}
      {err && <div className="error" onClick={() => setErr('')}>{err}</div>}

      {enc && <>
        {combs.length > 1 && <div className="cx-targets" role="group" aria-label="Alvo rápido">
          {combs.map((c) => <button key={c.id} className={`cx-tg${sel === c.id ? ' on' : ''}${enc.active_id === c.id ? ' act' : ''}`} title={c.name} aria-pressed={sel === c.id} onClick={() => setSel((x) => (x === c.id ? null : c.id))}>{short(c.name)}</button>)}
        </div>}
        <div className="sx-head">
          <button className="btn sm pri" onClick={() => act('next')}><Icon name="turn" size={14} />Próximo turno <kbd>N</kbd></button>
          <button className="btn sm" onClick={async () => (await confirmDialog('Reiniciar o combate?', { okLabel: 'Reiniciar' })) && act('reset')}>Reiniciar</button>
          <span className="spacer" />
          <div className="cx-addw">
            <button className="btn sm" aria-expanded={adding} onClick={() => { setAdding((v) => !v); setQ('') }}><Icon name="plus" size={12} /> Adicionar</button>
            {adding && (
              <div className="cx-menu" onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}>
                <div className="cx-menuh">
                  <input className="inp" autoFocus placeholder="Buscar PJ ou criatura…" value={q} onChange={(e) => setQ(e.target.value)} />
                  <input className="inp cx-cnt" type="number" min={1} value={count} title="Quantidade" aria-label="Quantidade" onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))} />
                </div>
                <div className="cx-menub">
                  {menu.filter((g) => g.items.length).map((g) => <div key={g.label}>
                    <div className="cx-grp">{g.label}</div>
                    {g.items.map((it) => <button key={it.id} className="cx-opt" onClick={() => addCombatant(g.k, it.id)}>{it.name}<Icon name="plus" size={12} /></button>)}
                  </div>)}
                  {menu.every((g) => !g.items.length) && <div className="cx-grp">Nada encontrado.</div>}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="cx-list">
          {combs.map((c, i) => (
            <Row key={c.id} c={c} active={enc.active_id === c.id} sel={sel === c.id} first={i === 0} last={i === combs.length - 1} conditions={cfg?.conditions ?? []}
              onSel={() => setSel((s) => (s === c.id ? null : c.id))}
              patch={(p) => patchComb(c, p)} move={(d) => move(i, d)}
              del={() => { setCombs((l) => l.filter((x) => x.id !== c.id)); setSel(null); remove('combatants', c.id).catch(fail) }} />
          ))}
        </div>
        {!combs.length && <div className="empty">Ninguém no combate. Use Adicionar para trazer PJs e criaturas.</div>}
      </>}
      {!enc && encs.length === 0 && <div className="empty">Nenhum encontro. Crie um com o botão +.</div>}

      {cfg && pcs.length > 0 && <>
        <h4 className="sx-h">Personagens</h4>
        <div className="cx-pcs">
          {pcs.map((p) => (
            <div className="cx-pc" key={p.id}>
              <b>{p.name}</b>
              {cfg.resources?.map((r) => {
                const v = p.data.resources?.[r.key] ?? { cur: 0, max: 0 }
                const set = (cur: number) => patchChar(p, { ...p.data, resources: { ...p.data.resources, [r.key]: { ...v, cur: Math.max(0, v.max ? Math.min(v.max, cur) : cur) } } } as any)
                return <span className="cx-res" key={r.key}><span className="k">{r.label}</span>
                  <button className="btn ico sm ghost" onClick={() => set(v.cur - 1)} aria-label={`Menos ${r.label}`}>−</button><span className="mono">{v.cur}/{v.max}</span><button className="btn ico sm ghost" onClick={() => set(v.cur + 1)} aria-label={`Mais ${r.label}`}>+</button></span>
              })}
              {allTracks(cfg, campaign).map((t) => (
                <span className="cx-res" key={t.key}><span className="k">{t.label}</span>
                  <Pips value={p.data.tracks?.[t.key] ?? 0} min={t.min} max={t.max}
                    onChange={(val) => patchChar(p, { ...p.data, tracks: { ...p.data.tracks, [t.key]: val } } as any)} /></span>
              ))}
            </div>
          ))}
        </div>
      </>}
    </div>
  )
}
