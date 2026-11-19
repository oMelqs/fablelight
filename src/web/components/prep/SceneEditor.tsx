import { useEffect, useRef, useState } from 'react'
import { create, uploadFile } from '../../api'
import { audioEngine, type AudioRow } from '../../audio/engine'
import type { AudioPreset, SceneRow } from '../../../shared/types'
import '../editor/ed.css'
import Icon from '../Icon'
import { Del, SaveBadge, Sec, type Save } from '../editor/ed'

type Point = SceneRow['points'][number]
type Check = NonNullable<Point['checks']>[number]
export interface Scene {
  id: number; campaign_id: number; session_id: number | null; ord: number; title: string
  read_aloud: string | null; gm_notes: string | null; points: Point[]; image: string | null
  audio_preset: AudioPreset; encounter_id: number | null
}
export interface Enc { id: number; name: string }
export interface Sess { id: number; number: number | null; title: string | null; date: string | null; summary: string | null; status: 'planned' | 'played' }

type Props = {
  scene: Scene; sessions: Sess[]; encounters: Enc[]; skills: string[]; audio: AudioRow[]
  onSave: (id: number, patch: Partial<Scene>) => Promise<unknown>
  onEncounterCreated: (e: Enc) => void
}

export default function SceneEditor({ scene, sessions, encounters, skills, audio, onSave, onEncounterCreated }: Props) {
  const [d, setD] = useState<Scene>({ ...scene, points: scene.points ?? [], audio_preset: scene.audio_preset ?? {} })
  const [st, setSt] = useState<Save>({ s: 'idle' })
  const [newEnc, setNewEnc] = useState('')
  const pending = useRef<Partial<Scene>>({})
  const timer = useRef<number>()
  const save = useRef(onSave)
  const file = useRef<HTMLInputElement>(null)
  save.current = onSave

  const flush = () => {
    clearTimeout(timer.current)
    const p = pending.current
    if (!Object.keys(p).length) return
    pending.current = {}
    setSt({ s: 'saving' })
    save.current(scene.id, p).then(() => setSt({ s: 'saved' })).catch((e) => setSt({ s: 'err', m: e.message }))
  }
  useEffect(() => flush, []) // flush on unmount / scene switch (component is keyed by scene id)

  const set = (patch: Partial<Scene>) => {
    setD((x) => ({ ...x, ...patch }))
    Object.assign(pending.current, patch)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, 700)
  }
  const setPoint = (i: number, p: Partial<Point>) => set({ points: d.points.map((x, j) => (j === i ? { ...x, ...p } : x)) })
  const setCheck = (i: number, k: number, c: Partial<Check>) =>
    setPoint(i, { checks: (d.points[i].checks ?? []).map((x, j) => (j === k ? { ...x, ...c } : x)) })

  const tracks = audio.filter((a) => a.kind === 'track')
  const ambients = audio.filter((a) => a.kind === 'ambient')
  const preset = d.audio_preset
  const amb = preset.ambients ?? []

  return (
    <div className="ed"><div className="ed-in wide">
      <header className="ed-head">
        <input className="ed-title" aria-label="Título da cena" placeholder="Título da cena" value={d.title} onChange={(e) => set({ title: e.target.value })} />
        <div className="ed-meta">
          <SaveBadge st={st} />
          <select className="input" aria-label="Sessão" value={d.session_id ?? ''} onChange={(e) => set({ session_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Sem sessão</option>
            {sessions.map((s) => <option key={s.id} value={s.id}>Sessão {s.number ?? '?'}{s.title ? ` — ${s.title}` : ''}</option>)}
          </select>
          {d.encounter_id && <span className="ed-pill ac"><Icon name="sword" size={12} />{encounters.find((e) => e.id === d.encounter_id)?.name ?? 'Encontro'}</span>}
        </div>
      </header>

      <div className="ed-cols">
        <div className="ed-main">
          <Sec title="Ler em voz alta" hint="o que os jogadores ouvem">
            <textarea className="ed-plate" aria-label="Texto para ler em voz alta" placeholder="Descreva o que os personagens veem, ouvem e sentem…" value={d.read_aloud ?? ''} onChange={(e) => set({ read_aloud: e.target.value })} />
          </Sec>
          <Sec title="Notas do mestre" hint="só você vê">
            <textarea className="ed-plate sm gm" aria-label="Notas do mestre" placeholder="Segredos, motivações, o que acontece se…" value={d.gm_notes ?? ''} onChange={(e) => set({ gm_notes: e.target.value })} />
          </Sec>
          <Sec title="Pontos de interesse" count={d.points.length}
            aside={<button className="btn" onClick={() => set({ points: [...d.points, { title: '', description: '', context: '', checks: [] }] })}><Icon name="plus" size={13} />Ponto</button>}>
            {!d.points.length && <div className="ed-empty">Pontos são o que a cena esconde: um objeto, uma pista, um detalhe que pede um teste.</div>}
            {d.points.map((p, i) => (
              <div className="ed-card ed-point" key={i}>
                <div className="ed-ph">
                  <span className="ed-idx">{i + 1}</span>
                  <input className="ed-ptitle" aria-label={`Título do ponto ${i + 1}`} placeholder="Título do ponto" value={p.title} onChange={(e) => setPoint(i, { title: e.target.value })} />
                  <Del label="Remover" onYes={() => set({ points: d.points.filter((_, j) => j !== i) })} />
                </div>
                <label className="ed-field"><span>O que os jogadores percebem</span>
                  <textarea className="input ed-area" value={p.description ?? ''} onChange={(e) => setPoint(i, { description: e.target.value })} /></label>
                <label className="ed-field"><span className="ed-gmlab">Verdade, só mestre</span>
                  <textarea className="input ed-area" value={p.context ?? ''} onChange={(e) => setPoint(i, { context: e.target.value })} /></label>
                <div className="ed-checks">
                  {(p.checks ?? []).map((c, k) => (
                    <div className="ed-check" key={k}>
                      <input className="input sk" list="ed-skills" aria-label="Perícia" placeholder="Perícia" value={c.skill} onChange={(e) => setCheck(i, k, { skill: e.target.value })} />
                      <input className="input num" type="number" aria-label="DT" placeholder="DT" value={c.dt ?? ''} onChange={(e) => setCheck(i, k, { dt: Number(e.target.value) })} />
                      <input className="input info" aria-label="Informação revelada" placeholder="O que o teste revela" value={c.info ?? ''} onChange={(e) => setCheck(i, k, { info: e.target.value })} />
                      <button className="btn-x" title="Remover teste" aria-label="Remover teste" onClick={() => setPoint(i, { checks: (p.checks ?? []).filter((_, j) => j !== k) })}><Icon name="x" size={14} /></button>
                    </div>
                  ))}
                  <div><button className="btn btn-ghost" onClick={() => setPoint(i, { checks: [...(p.checks ?? []), { skill: '', dt: 7, info: '' }] })}><Icon name="plus" size={13} />Teste</button></div>
                </div>
              </div>
            ))}
            <datalist id="ed-skills">{skills.map((s) => <option key={s} value={s} />)}</datalist>
          </Sec>
        </div>

        <aside className="ed-side">
          <Sec title="Imagem">
            <div className="ed-card">
              <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return
                try { set({ image: (await uploadFile(f)).path }) } catch (err) { setSt({ s: 'err', m: (err as Error).message }) }
                e.target.value = ''
              }} />
              {d.image && <img className="ed-img" src={d.image} alt="" />}
              <div className="row">
                <button className="btn" onClick={() => file.current?.click()}>{d.image ? 'Trocar' : 'Escolher imagem'}</button>
                {d.image && <button className="btn btn-ghost danger" onClick={() => set({ image: null })}>Remover</button>}
              </div>
            </div>
          </Sec>

          <Sec title="Encontro">
            <div className="ed-card">
              <select className="input" aria-label="Encontro vinculado" value={d.encounter_id ?? ''} onChange={(e) => set({ encounter_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Nenhum</option>
                {encounters.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <div className="row nowrap">
                <input className="input" style={{ flex: 1 }} placeholder="Novo encontro" aria-label="Nome do novo encontro" value={newEnc} onChange={(e) => setNewEnc(e.target.value)} />
                <button className="btn" disabled={!newEnc.trim()} onClick={async () => {
                  const e = await create<Enc>('encounters', { campaign_id: scene.campaign_id, name: newEnc.trim() })
                  onEncounterCreated(e); set({ encounter_id: e.id }); setNewEnc('')
                }}>Criar</button>
              </div>
            </div>
          </Sec>

          <Sec title="Áudio" aside={<button className="btn btn-ghost" onClick={() => audioEngine.applyPreset(preset, audio)}><Icon name="play" size={11} />Testar</button>}>
            <div className="ed-card">
              <select className="input" aria-label="Trilha" value={preset.track ?? ''} onChange={(e) => set({ audio_preset: { ...preset, track: e.target.value ? Number(e.target.value) : undefined } })}>
                <option value="">Sem trilha</option>
                {tracks.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {ambients.map((a) => {
                const cur = amb.find((x) => x.id === a.id)
                const put = (v: { id: number; volume: number } | null) =>
                  set({ audio_preset: { ...preset, ambients: [...amb.filter((x) => x.id !== a.id), ...(v ? [v] : [])] } })
                return (
                  <div className="ed-arow" key={a.id}>
                    <label><input type="checkbox" checked={!!cur} onChange={(e) => put(e.target.checked ? { id: a.id, volume: a.volume ?? 0.5 } : null)} />{a.name}</label>
                    {cur && <input type="range" aria-label={`Volume de ${a.name}`} min={0} max={1} step={0.05} value={cur.volume} onChange={(e) => put({ id: a.id, volume: Number(e.target.value) })} />}
                  </div>
                )
              })}
              {!audio.length && <span className="muted">Nenhum áudio cadastrado.</span>}
            </div>
          </Sec>
        </aside>
      </div>
    </div></div>
  )
}
