import { useEffect, useState } from 'react'
import { get, list, update } from '../api'
import CharacterSheet, { type Character } from '../components/combat/CharacterSheet'
import BookReader from '../components/books/BookReader'
import CreatureTab from '../components/library/CreatureEditor'
import SystemTab from '../components/library/SystemEditor'
import NoteEditor from '../components/prep/NotesPanel'
import SessionEditor from '../components/prep/SessionEditor'
import SceneEditor, { type Enc, type Scene, type Sess } from '../components/prep/SceneEditor'
import CombatColumn from '../components/session/CombatColumn'
import SceneColumn from '../components/session/SceneColumn'
import AudioTab from '../components/tools/AudioTab'
import BooksTab from '../components/tools/BooksTab'
import CalculatorTab from '../components/tools/CalculatorTab'
import type { AudioRow } from '../audio/engine'
import Audio from '../pages/Audio'
import Bestiario from '../pages/Bestiario'
import Livros from '../pages/Livros'
import Sistemas from '../pages/Sistemas'
import { useWs } from './ctx'
import { notifyItems } from './data'
import type { PanelType, TabRef } from './layout'
import LogPanel from './LogPanel'
import { sceneKey } from './log'
import { lsGet } from './util'

const Pad = ({ children }: { children: React.ReactNode }) => <div className="pn">{children}</div>

function SceneEditPanel({ sceneId }: { sceneId?: number }) {
  const { campaignId, system } = useWs()
  const [d, setD] = useState<{ scene?: Scene; sessions: Sess[]; encs: Enc[]; audio: AudioRow[] }>()
  const [failed, setFailed] = useState(false)
  const [tries, setTries] = useState(0)
  useEffect(() => {
    setFailed(false)
    Promise.all([list<Scene>('scenes', { campaign_id: campaignId }), list<Sess>('sessions', { campaign_id: campaignId }), list<Enc>('encounters', { campaign_id: campaignId }), list<AudioRow>('audio', { campaign_id: campaignId, library: 1 })])
      .then(([scenes, sessions, encs, audio]) => {
        const want = sceneId ?? (Number(lsGet(sceneKey(campaignId))) || undefined)
        setD({ scene: scenes.find((s) => s.id === want) ?? (sceneId ? undefined : scenes[0]), sessions, encs, audio })
      }).catch(() => setFailed(true))
  }, [campaignId, sceneId, tries])
  if (failed && !d) return <Pad><div className="empty">Não foi possível carregar a cena. <button className="btn sm" onClick={() => setTries((n) => n + 1)}>Tentar de novo</button></div></Pad>
  if (!d) return <Pad><div className="muted">Carregando…</div></Pad>
  if (!d.scene) return <Pad><div className="empty">Abra uma cena pelo explorador para editá-la.</div></Pad>
  return (
    <>
      <SceneEditor key={d.scene.id} scene={d.scene} sessions={d.sessions} encounters={d.encs} audio={d.audio}
        skills={(system?.config.skills ?? []).map((s) => s.label)}
        onSave={async (id, patch) => { await update('scenes', id, patch as any); notifyItems() }}
        onEncounterCreated={(e) => { setD((x) => x && { ...x, encs: [...x.encs, e] }); notifyItems() }} />
    </>
  )
}

function CharacterPanel({ id }: { id: number }) {
  const { system, campaign } = useWs()
  const [c, setC] = useState<Character | null | undefined>()
  useEffect(() => { get<Character>('characters', id).then(setC).catch(() => setC(null)) }, [id])
  if (c === null) return <Pad><div className="empty">Personagem não encontrado.</div></Pad>
  if (!c || !system) return <Pad><div className="muted">Carregando…</div></Pad>
  return <CharacterSheet key={c.id} character={c} config={system.config} campaign={campaign} />
}

function PartyPanel() {
  const { campaignId, system } = useWs()
  const [pcs, setPcs] = useState<Character[]>([])
  useEffect(() => {
    const load = () => list<Character>('characters', { campaign_id: campaignId }).then((r) => setPcs(r.filter((c) => c.kind === 'pc'))).catch(() => {})
    load(); const t = setInterval(load, 5000); return () => clearInterval(t)
  }, [campaignId])
  return (
    <Pad><div className="stack-sm">
      {pcs.map((p) => (
        <div className="pcr" key={p.id}>
          <div className="r"><div className="who"><b>{p.name}</b><span>{p.player}</span></div>
            {(system?.config.resources ?? []).map((r) => {
              const v = p.data.resources?.[r.key] ?? { cur: 0, max: 0 }
              return <div className="rs" key={r.key}><span className="k">{r.label}</span><div className="bar"><i className={r.key === 'pv' && v.cur / (v.max || 1) <= 0.4 ? 'low' : r.key === 'pv' ? '' : 'pd'} style={{ width: `${v.max ? (v.cur / v.max) * 100 : 0}%` }} /></div><span className="v">{v.cur}<small>/{v.max}</small></span></div>
            })}
          </div>
        </div>
      ))}
      {!pcs.length && <div className="muted">Nenhum personagem de jogador.</div>}
    </div></Pad>
  )
}

type PanelProps = { tab: TabRef }
export const PANELS: Record<PanelType, (p: PanelProps) => React.ReactElement> = {
  log: () => <LogPanel />,
  scene: () => <SceneColumn campaignId={useWs().campaignId} />,
  combat: () => <CombatColumn campaignId={useWs().campaignId} />,
  calc: () => <Pad><CalculatorTab campaignId={useWs().campaignId} /></Pad>,
  books: () => <Pad><BooksTab campaignId={useWs().campaignId} /></Pad>,
  audio: () => <Pad><AudioTab campaignId={useWs().campaignId} /></Pad>,
  party: () => <PartyPanel />,
  'scene-edit': ({ tab }) => <SceneEditPanel key={String(tab.ref)} sceneId={tab.ref ? Number(tab.ref) : undefined} />,
  encounter: ({ tab }) => <CombatColumn key={String(tab.ref)} campaignId={useWs().campaignId} encounterId={Number(tab.ref)} />,
  character: ({ tab }) => <CharacterPanel id={Number(tab.ref)} />,
  creature: ({ tab }) => <CreatureTab key={String(tab.ref)} id={Number(tab.ref)} tabId={tab.id} />,
  note: ({ tab }) => <NoteEditor key={String(tab.ref)} id={Number(tab.ref)} tabId={tab.id} />,
  session: ({ tab }) => <SessionEditor key={String(tab.ref)} id={Number(tab.ref)} />,
  book: ({ tab }) => { const [b, c] = String(tab.ref).split(':').map(Number); return b && c ? <BookReader key={String(tab.ref)} bookId={b} chunkId={c} /> : <Pad><div className="empty">Trecho não encontrado.</div></Pad> },
  system: ({ tab }) => <SystemTab key={String(tab.ref)} id={Number(tab.ref)} tabId={tab.id} />,
  'library-systems': () => <Sistemas />,
  'library-bestiary': () => <Bestiario campaignId={useWs().campaignId} />,
  'library-books': () => <Livros />,
  'library-audio': () => <Audio campaignId={useWs().campaignId} />,
}
