import { useState } from 'react'
import { update } from '../../api'
import { SaveBadge, Sec, Seg, Val, useAutosaveEq, useSaving } from '../editor/ed'
import type { Campaign, CharacterData, SystemConfig } from '../../../shared/types'
import './combat.css'

export interface Character { id: number; campaign_id: number; kind: 'pc' | 'npc'; name: string; player: string | null; data: Partial<CharacterData>; notes: string | null }

export const allTracks = (config: SystemConfig, campaign?: Campaign) => [...(config.tracks ?? []), ...(campaign?.config?.tracks ?? [])]

export function Pips({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  if (max - min > 12) {
    return (
      <span className="row">
        <button className="btn cb-mini" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <strong>{value}</strong>
        <button className="btn cb-mini" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </span>
    )
  }
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  // min<0 tracks: pips from min..max, filled up to value; with min 0 the value 0 = none filled
  return (
    <span className="cb-pips">
      {steps.filter((s) => s !== 0 || min < 0).map((s) => (
        <button key={s} title={String(s)} className={`cb-pip${(min < 0 ? s === value : s <= value) ? ' on' : ''}`}
          onClick={() => onChange(s === value ? (min < 0 ? 0 : s - 1) : s)} />
      ))}
      <span className="muted cb-sm">{value}</span>
    </span>
  )
}

export default function CharacterSheet({ character, config, campaign }: { character: Character; config: SystemConfig; campaign?: Campaign }) {
  const [name, setName] = useState(character.name)
  const [player, setPlayer] = useState(character.player ?? '')
  const [kind, setKind] = useState(character.kind)
  const [notes, setNotes] = useState(character.notes ?? '')
  const [data, setData] = useState<Partial<CharacterData>>(character.data ?? {})
  const [st, track] = useSaving()
  useAutosaveEq({ name, player, kind, notes, data }, (v) => { track(update('characters', character.id, v)) })

  const dice = config.dice ?? []
  const pool = config.roll?.mode === 'pool'
  const attrs = config.attributes ?? []
  const skills = config.skills ?? []
  const setMap = <K extends 'fields' | 'attributes' | 'skills' | 'marks' | 'tracks'>(k: K, key: string, v: any) =>
    setData((d) => ({ ...d, [k]: { ...(d[k] as any), [key]: v } }))
  const res = (key: string) => data.resources?.[key] ?? { cur: 0, max: 0 }
  const setRes = (key: string, p: Partial<{ cur: number; max: number }>) =>
    setData((d) => ({ ...d, resources: { ...d.resources, [key]: { ...res(key), ...p } } }))
  const fillEmpty = (k: 'attributes' | 'skills', keys: string[]) =>
    setData((d) => ({ ...d, [k]: { ...Object.fromEntries(keys.map((x) => [x, dice[0]])), ...Object.fromEntries(Object.entries(d[k] ?? {}).filter(([, v]) => v)) } }))
  const emptyN = (k: 'attributes' | 'skills', keys: string[]) => keys.filter((x) => !data[k]?.[x]).length
  const fillBtn = (k: 'attributes' | 'skills', keys: string[]) => pool && dice.length > 0 && emptyN(k, keys) > 0 && (
    <button className="btn btn-ghost" onClick={() => fillEmpty(k, keys.map((x) => x))}>Preencher {emptyN(k, keys)} vazios com d{dice[0]}</button>
  )

  const groups = [
    ...attrs.map((a) => ({ label: a.label, items: skills.filter((s) => s.attribute === a.key) })),
    { label: attrs.length ? 'Outras' : 'Perícias', items: skills.filter((s) => !attrs.some((a) => a.key === s.attribute)) },
  ].filter((g) => g.items.length)
  const tracks = allTracks(config, campaign)

  return (
    <div className="ed"><div className="ed-in wide">
      <header className="ed-head">
        <input className="ed-title" aria-label="Nome" placeholder="Nome do personagem" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="ed-meta">
          <SaveBadge st={st} />
          <Seg label="Tipo" value={kind} options={[['pc', 'PJ'], ['npc', 'NPC']]} onChange={setKind} />
          <input className="input" style={{ width: 180 }} aria-label="Jogador" placeholder={kind === 'pc' ? 'Jogador' : 'Papel / observação'} value={player} onChange={(e) => setPlayer(e.target.value)} />
        </div>
      </header>

      {!!config.fields?.length && (
        <div className="ed-tiles">
          {config.fields.map((f) => (
            <label className="ed-field" key={f.key}><span>{f.label}</span>
              {f.type === 'select'
                ? <select className="input" value={String(data.fields?.[f.key] ?? '')} onChange={(e) => setMap('fields', f.key, e.target.value)}>
                    <option value="">—</option>{f.options?.map((o) => <option key={o}>{o}</option>)}
                  </select>
                : <input className="input" type={f.type === 'number' ? 'number' : 'text'} value={String(data.fields?.[f.key] ?? '')}
                    onChange={(e) => setMap('fields', f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)} />}
            </label>
          ))}
        </div>
      )}

      {!!config.resources?.length && (
        <Sec title="Recursos">
          <div className="ed-tiles">
            {config.resources.map((r, i) => {
              const v = res(r.key)
              return (
                <div className="ed-tile" key={r.key}><b>{r.label}</b>
                  <div className="ed-res">
                    <input className="input" type="number" aria-label={`${r.label} atual`} value={v.cur} onChange={(e) => setRes(r.key, { cur: Number(e.target.value) })} />
                    <span>/</span>
                    <input className="input" type="number" aria-label={`${r.label} máximo`} value={v.max} onChange={(e) => setRes(r.key, { max: Number(e.target.value) })} />
                  </div>
                  <div className={`ed-bar${i > 0 ? ' pd' : ''}${i === 0 && v.max && v.cur / v.max <= 0.4 ? ' low' : ''}`}><i style={{ width: `${v.max ? Math.min(100, (v.cur / v.max) * 100) : 0}%` }} /></div>
                </div>
              )
            })}
          </div>
        </Sec>
      )}

      {!!attrs.length && (
        <Sec title="Atributos" aside={fillBtn('attributes', attrs.map((a) => a.key))}>
          <div className="ed-tiles">
            {attrs.map((a) => (
              <div className="ed-tile" key={a.key}><b>{a.label}</b>
                <Val label={a.label} pool={pool} dice={dice} value={data.attributes?.[a.key]} onChange={(v) => setMap('attributes', a.key, v)} /></div>
            ))}
          </div>
        </Sec>
      )}

      {!!skills.length && (
        <Sec title="Perícias" aside={fillBtn('skills', skills.map((s) => s.key))}>
          <div className="ed-skills">
            {groups.map((g) => (
              <div className="ed-grp" key={g.label}>
                {(groups.length > 1) && <h4>{g.label}</h4>}
                {g.items.map((s) => (
                  <div className={`ed-skill${data.skills?.[s.key] ? '' : ' blank'}`} key={s.key}>
                    <span className="nm">{s.label}</span>
                    <Val label={s.label} pool={pool} dice={dice} value={data.skills?.[s.key]} onChange={(v) => setMap('skills', s.key, v)} />
                    <span className="ed-marks" title="Marcas de avanço">
                      <button aria-label={`Menos uma marca em ${s.label}`} onClick={() => setMap('marks', s.key, Math.max(0, (data.marks?.[s.key] ?? 0) - 1))}>−</button>
                      <b>{data.marks?.[s.key] ?? 0}</b>
                      <button aria-label={`Mais uma marca em ${s.label}`} onClick={() => setMap('marks', s.key, (data.marks?.[s.key] ?? 0) + 1)}>+</button>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Sec>
      )}

      {tracks.length > 0 && (
        <Sec title="Trilhas">
          <div className="ed-tiles">
            {tracks.map((t) => (
              <div className="ed-tile" key={t.key}><b>{t.label}<small>{t.min} a {t.max}</small></b>
                <Pips value={data.tracks?.[t.key] ?? 0} min={t.min} max={t.max} onChange={(v) => setMap('tracks', t.key, v)} /></div>
            ))}
          </div>
        </Sec>
      )}

      <Sec title="Notas">
        <textarea className="ed-plate sm" aria-label="Notas" placeholder="História, aparência, segredos, ganchos…" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Sec>
    </div></div>
  )
}
