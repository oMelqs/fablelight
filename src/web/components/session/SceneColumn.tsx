import { useEffect, useState } from 'react'
import { list, update } from '../../api'
import { audioEngine, type AudioRow } from '../../audio/engine'
import type { Scene, Sess } from '../prep/SceneEditor'
import Markdown from '../books/markdown'
import '../books/books.css'
import './session.css'
import Icon from '../Icon'
import { enterScene, logEvent, sceneKey } from '../../workspace/log'
import { listen } from '../../workspace/util'


export default function SceneColumn({ campaignId }: { campaignId: number }) {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [sessions, setSessions] = useState<Sess[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [open, setOpen] = useState<Record<number, boolean>>({})

  useEffect(() => {
    Promise.all([list<Scene>('scenes', { campaign_id: campaignId }), list<Sess>('sessions', { campaign_id: campaignId })]).then(([sc, se]) => {
      setScenes(sc); setSessions(se)
      let saved: number | null = null
      try { saved = Number(localStorage.getItem(sceneKey(campaignId))) || null } catch {}
      setSel(sc.some((s) => s.id === saved) ? saved : sc[0]?.id ?? null)
    }).catch(() => {})
  }, [campaignId])

  useEffect(() => listen('rpgtable:scene', (d: { sceneId: number }) => setSel(d.sceneId)), [])

  const pick = (id: number | null) => { setSel(id); if (id) enterScene(campaignId, id) }
  const scene = scenes.find((s) => s.id === sel)

  /** Sets `found` on the given checks of one point and logs each check that just became found. */
  const setFound = (pi: number, js: number[], v: boolean) => {
    if (!scene) return
    const pt = scene.points[pi]
    const points = scene.points.map((p, i) => i !== pi ? p : { ...p, checks: (p.checks ?? []).map((c, j) => js.includes(j) ? { ...c, found: v } : c) })
    setScenes((x) => x.map((s) => (s.id === scene.id ? { ...s, points } : s)))
    update('scenes', scene.id, { points }).catch(() => {})
    if (v) js.forEach((j) => {
      const ck = pt?.checks?.[j]
      if (ck && !ck.found) logEvent('scene', `${pt.title || 'Ponto'} descoberto`, { type: 'found', title: pt.title, skill: ck.skill, dt: ck.dt, info: ck.info, scene: scene.title, via: 'Cena' })
    })
  }
  const applyAudio = async () => {
    if (!scene) return
    audioEngine.applyPreset(scene.audio_preset ?? {}, await list<AudioRow>('audio', { campaign_id: campaignId, library: 1 }))
  }

  const groups = [...sessions.map((s) => ({ label: `#${s.number ?? '?'} ${s.title ?? ''}`, items: scenes.filter((x) => x.session_id === s.id) })),
    { label: 'Sem sessão', items: scenes.filter((x) => !sessions.some((s) => s.id === x.session_id)) }].filter((g) => g.items.length)
  const flat = groups.flatMap((g) => g.items)
  const idx = flat.findIndex((s) => s.id === sel)
  const allCks = scene ? scene.points.flatMap((p) => p.checks ?? []) : []

  return (
    <div className="sx">
      {scene && <div className="sx-head sc-nav">
        <h2 className="sc-title" title={scene.title}>{scene.title}</h2>
        <button className="btn ico sm ghost" aria-label="Cena anterior" disabled={idx <= 0} onClick={() => pick(flat[idx - 1].id)}><Icon name="back" size={14} /></button>
        <span className="sc-n mono" aria-label={`Cena ${idx + 1} de ${flat.length}`}>{idx + 1}/{flat.length}</span>
        <button className="btn ico sm ghost" aria-label="Próxima cena" disabled={idx >= flat.length - 1} onClick={() => pick(flat[idx + 1].id)}><Icon name="chevron" size={14} /></button>
        {flat.length > 5 && <select className="cx-enc sc-jump" aria-label="Ir para cena" value={sel ?? ''} onChange={(e) => pick(Number(e.target.value) || null)}>
          {groups.map((g) => <optgroup key={g.label} label={g.label}>{g.items.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</optgroup>)}
        </select>}
      </div>}
      {!scenes.length && <div className="empty">Nenhuma cena ainda. Crie uma pelo explorador.</div>}
      {scene && <>
        <div className="sx-head">
          <button className="btn sm" onClick={applyAudio}><Icon name="audio" size={14} /> Aplicar áudio da cena</button>
          {scene.encounter_id && <button className="btn sm pri" onClick={() => window.dispatchEvent(new CustomEvent('rpgtable:open-encounter', { detail: { encounterId: scene.encounter_id } }))}><Icon name="sword" size={14} /> Abrir encontro</button>}
        </div>
        {scene.read_aloud && <div className="sc-plate"><p>{scene.read_aloud}</p></div>}
        {scene.points.length > 0 && <h3 className="sc-sec">Pontos de interesse{allCks.length > 0 && <span> · {allCks.filter((c) => c.found).length}/{allCks.length} encontrados</span>}</h3>}
        {scene.points.length > 0 && <div className="sc-pts">
          {scene.points.map((p, i) => {
            const cks = p.checks ?? [], nf = cks.filter((c) => c.found).length
            const isOpen = !!open[i]
            return (
              <div className={`sc-pt${isOpen ? ' open' : ''}${cks.length && nf === cks.length ? ' found' : ''}`} key={i}>
                <div className="sc-pth">
                  <button className="sc-ptm" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}>
                    <Icon name="chevron" size={12} />
                    <span className="sc-pn">{p.title || '(sem título)'}</span>
                    {!isOpen && p.description && <span className="sc-pd">{p.description}</span>}
                    {cks.length > 0 && <span className="sc-cnt mono">{nf}/{cks.length}</span>}
                  </button>
                  {cks.length > 0 && <button className={`sw${nf === cks.length ? ' on' : ''}`} role="switch" aria-checked={nf === cks.length} aria-label={`Encontrado: ${p.title || 'ponto'}`} title={nf === cks.length ? 'Marcar como não encontrado' : 'Marcar como encontrado'} onClick={() => setFound(i, cks.map((_, j) => j), nf !== cks.length)}><i /></button>}
                </div>
                <div className="sc-ptb"><div><div className="sc-pti">
                  {p.description && <div className="sc-desc">{p.description}</div>}
                  {p.context && <div className="sc-gm"><span className="sc-lbl">Só mestre</span><Markdown text={p.context} /></div>}
                  {cks.map((c, j) => (
                    <div key={j} className={`sc-ck${c.found ? ' on' : ''}`}>
                      <div className="sc-ckh"><b>{c.skill}</b><span className="sc-dt mono">DT {c.dt}</span><span className="spacer" />
                        <button className={`sw${c.found ? ' on' : ''}`} role="switch" aria-checked={!!c.found} aria-label={`Encontrada: ${c.skill}`} onClick={() => setFound(i, [j], !c.found)}><i /></button></div>
                      {c.info && <div className="sc-info">{c.info}</div>}
                    </div>
                  ))}
                </div></div></div>
              </div>
            )
          })}
        </div>}
        {scene.gm_notes && <div className="sc-gm"><span className="sc-lbl">Notas do mestre</span><Markdown text={scene.gm_notes} /></div>}
      </>}
    </div>
  )
}
