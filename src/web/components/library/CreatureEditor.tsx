import { useContext, useEffect, useState } from 'react'
import { get, remove, update } from '../../api'
import type { CreatureStats, System } from '../../../shared/types'
import { WsContext } from '../../workspace/ctx'
import { notifyItems } from '../../workspace/data'
import { Del, Msg, SaveBadge, Sec, TagInput, Val, useDoc, useSaving , useAutosaveEq } from '../editor/ed'
import Icon from '../Icon'

export interface Creature { id: number; system_id: number; campaign_id: number | null; name: string; tier: string | null; tags: string | null; stats: CreatureStats; traits: string | null; notes: string | null }
export const TIERS = ['Lacaio', 'Soldado', 'Elite', 'Terror', 'Lenda']

export function CreatureEditor({ creature, config, onDelete, onCopy, scopeLabel }: {
  creature: Creature; config: System['config']; onDelete: () => void; onCopy?: () => void; scopeLabel?: string
}) {
  const [c, setC] = useState({ name: creature.name, tier: creature.tier ?? '', tags: creature.tags ?? '', stats: creature.stats ?? {}, traits: creature.traits ?? '', notes: creature.notes ?? '' })
  const [st, track] = useSaving()
  useAutosaveEq(c, (v) => { track(update('creatures', creature.id, v)) })
  const s = c.stats
  const setSt = (p: Partial<CreatureStats>) => setC((x) => ({ ...x, stats: { ...x.stats, ...p } }))
  const setMap = (k: 'attributes' | 'skills', key: string, v: number) => setSt({ [k]: { ...s[k], [key]: v } })
  const dice = config.dice ?? []
  const pool = config.roll?.mode === 'pool'
  const attrs = config.attributes ?? []
  const skills = config.skills ?? []
  const used = skills.filter((k) => s.skills?.[k.key])
  const free = skills.filter((k) => !s.skills?.[k.key])
  const first = pool ? dice[0] ?? 4 : 1

  return (
    <div className="ed"><div className="ed-in">
      <header className="ed-head">
        <input className="ed-title" aria-label="Nome" placeholder="Nome da criatura" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
        <div className="ed-meta">
          <SaveBadge st={st} />
          {scopeLabel && <span className="ed-pill dim">{scopeLabel}</span>}
          <div className="ed-dice" role="group" aria-label="Nível">
            {TIERS.map((t) => <button key={t} type="button" className={`ed-die${c.tier === t ? ' on' : ''}`} style={{ fontFamily: 'var(--sans)' }} aria-pressed={c.tier === t} onClick={() => setC({ ...c, tier: c.tier === t ? '' : t })}>{t}</button>)}
          </div>
          <span className="spacer" />
          {onCopy && <button className="btn btn-primary" onClick={onCopy}>Copiar para a campanha</button>}
          <Del label="Apagar" onYes={onDelete} />
        </div>
      </header>

      <div className="ed-tiles">
        <div className="ed-tile"><b>Pontos de vida</b><input className="input num ed-score" style={{ width: '100%', height: 36, font: '600 20px var(--mono)' }} type="number" aria-label="Pontos de vida" value={s.hp ?? ''} placeholder="0" onChange={(e) => setSt({ hp: Number(e.target.value) })} /></div>
        <div className="ed-tile"><b>Armadura</b><input className="input num ed-score" style={{ width: '100%', height: 36, font: '600 20px var(--mono)' }} type="number" aria-label="Armadura" value={s.armor ?? ''} placeholder="0" onChange={(e) => setSt({ armor: Number(e.target.value) })} /></div>
        <div className="ed-tile"><b>Dano</b><input className="input ed-score" style={{ width: '100%', height: 36, font: '600 16px var(--mono)' }} aria-label="Dano" value={s.damage ?? ''} placeholder="ex.: 2d6" onChange={(e) => setSt({ damage: e.target.value })} /></div>
      </div>

      {!!attrs.length && (
        <Sec title="Atributos">
          <div className="ed-tiles">
            {attrs.map((a) => <div className="ed-tile" key={a.key}><b>{a.label}</b><Val label={a.label} pool={pool} dice={dice} value={s.attributes?.[a.key]} onChange={(v) => setMap('attributes', a.key, v)} /></div>)}
          </div>
        </Sec>
      )}

      {!!skills.length && (
        <Sec title="Perícias" count={used.length} aside={!!free.length && (
          <select className="input" style={{ height: 28 }} aria-label="Adicionar perícia" value="" onChange={(e) => e.target.value && setMap('skills', e.target.value, first)}>
            <option value="">+ Adicionar perícia</option>
            {free.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        )}>
          {used.length > 0
            ? <div className="ed-grp">{used.map((k) => (
                <div className="ed-skill" key={k.key}><span className="nm">{k.label}</span>
                  <Val label={k.label} pool={pool} dice={dice} value={s.skills?.[k.key]} onChange={(v) => setMap('skills', k.key, v)} />
                  <button className="btn-x" aria-label={`Remover ${k.label}`} title="Remover" onClick={() => setMap('skills', k.key, 0)}><Icon name="x" size={13} /></button>
                </div>))}</div>
            : <div className="ed-hintrow">Só as perícias que a criatura tem. Use o seletor acima.</div>}
        </Sec>
      )}

      <Sec title="Características"><textarea className="ed-plate sm" aria-label="Características" placeholder="Habilidades, ataques especiais, comportamento…" value={c.traits} onChange={(e) => setC({ ...c, traits: e.target.value })} /></Sec>
      <Sec title="Notas"><textarea className="ed-plate sm gm" aria-label="Notas" placeholder="Táticas, fraquezas, onde aparece…" value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} /></Sec>
      <Sec title="Tags"><TagInput value={c.tags} onChange={(tags) => setC({ ...c, tags })} /></Sec>
    </div></div>
  )
}

/** Editor tab for one creature: loads the creature and its system. */
export default function CreatureTab({ id, tabId }: { id: number; tabId?: string }) {
  const ws = useContext(WsContext)
  const creature = useDoc<Creature>('creatures', id)
  const [sys, setSys] = useState<System | null | undefined>()
  useEffect(() => { if (creature) get<System>('systems', creature.system_id).then(setSys, () => setSys(null)) }, [creature])
  if (creature === null) return <Msg>Criatura não encontrada.</Msg>
  if (!creature || sys === undefined) return <Msg>Carregando…</Msg>
  if (!sys) return <Msg>Sistema da criatura não encontrado.</Msg>
  return <CreatureEditor key={id} creature={creature} config={sys.config} scopeLabel={creature.campaign_id ? 'Campanha' : 'Biblioteca'}
    onDelete={async () => { await remove('creatures', id).catch(() => {}); notifyItems(); if (tabId) ws?.closeTab(tabId) }} />
}
