import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { list, remove } from '../api'
import { audioEngine } from '../audio/engine'
import { useAudioState } from '../audio/useAudio'
import AudioForm, { type AudioItem } from '../components/audio/AudioForm'
import '../components/audio/audio.css'
import { Del, Sec } from '../components/editor/ed'
import '../components/editor/ed.css'
import Icon from '../components/Icon'

const GROUPS = [['track', 'Trilhas'], ['ambient', 'Ambientes'], ['sfx', 'Efeitos']] as const

export default function Audio({ campaignId }: { campaignId?: number } = {}) {
  const [sp] = useSearchParams()
  const campaign = campaignId ?? (sp.get('campaign') ? Number(sp.get('campaign')) : null)
  const [items, setItems] = useState<AudioItem[]>([])
  const [campaigns, setCampaigns] = useState<{ id: number; name: string }[]>([])
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<AudioItem | 'new' | null>(null)
  const [err, setErr] = useState('')
  const st = useAudioState()

  const load = useCallback(() => {
    list<AudioItem>('audio', campaign ? { campaign_id: campaign, library: true } : {}).then(setItems).catch((e) => setErr(e.message))
  }, [campaign])
  useEffect(load, [load])
  useEffect(() => { list('campaigns').then(setCampaigns).catch(() => {}) }, [])

  const needle = q.trim().toLowerCase()
  const shown = items.filter((a) => !needle || `${a.name} ${a.tags ?? ''}`.toLowerCase().includes(needle))
  const scope = (a: AudioItem) => a.campaign_id ? campaigns.find((c) => c.id === a.campaign_id)?.name ?? `Campanha ${a.campaign_id}` : 'Biblioteca'
  const playing = (a: AudioItem) => st.track?.id === a.id || st.ambients.some((x) => x.id === a.id)
  const preview = (a: AudioItem) => a.kind === 'track' ? (playing(a) ? audioEngine.stopTrack() : audioEngine.playTrack(a))
    : a.kind === 'ambient' ? audioEngine.toggleAmbient(a) : audioEngine.playSfx(a)
  const del = async (a: AudioItem) => { await remove('audio', a.id).catch((e) => setErr(e.message)); load() }
  const done = () => { setEditing(null); load() }

  return (
    <div className="ed lib-page"><div className="ed-in wide">
      <header className="ed-head">
        <div className="ed-meta">
          <h1 style={{ fontSize: 28, letterSpacing: '-.02em' }}>Áudio</h1><span className="spacer" />
          <input className="input" type="search" style={{ width: 220 }} aria-label="Filtrar" placeholder="Filtrar por nome ou tag" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setEditing('new')}><Icon name="plus" size={13} />Novo áudio</button>
        </div>
      </header>
      {err && <div className="ed-err">{err}</div>}
      {editing && <AudioForm key={editing === 'new' ? 'new' : editing.id} item={editing === 'new' ? undefined : editing}
        campaigns={campaigns} defaultCampaign={campaign} onDone={done} />}
      {GROUPS.map(([kind, label]) => {
        const rows = shown.filter((a) => a.kind === kind)
        return (
          <Sec key={kind} title={label} count={rows.length}>
            {rows.length === 0 ? <div className="ed-empty" style={{ padding: 12 }}>Nada aqui.</div> : (
              <div className="ed-card flat" style={{ padding: '2px 12px' }}>
                {rows.map((a) => (
                  <div key={a.id} className="lib-row">
                    <button className={`btn${playing(a) ? ' btn-primary' : ''}`} aria-label={playing(a) ? 'Parar' : 'Tocar'} onClick={() => preview(a)}><Icon name={playing(a) ? 'stop' : 'play'} size={12} /></button>
                    <span className="nm">{a.name}</span>
                    {a.source === 'youtube' && <span className="ed-pill dim">YouTube</span>}
                    <span className="ed-pill dim">{scope(a)}</span>
                    {a.tags?.split(',').map((t) => t.trim()).filter(Boolean).map((t) => <span key={t} className="ed-pill">{t}</span>)}
                    <button className="btn btn-ghost" onClick={() => setEditing(a)}>Editar</button>
                    <Del label="" onYes={() => del(a)} />
                  </div>
                ))}
              </div>
            )}
          </Sec>
        )
      })}
    </div></div>
  )
}
