import { useEffect, useState } from 'react'
import { list } from '../../api'
import { audioEngine, type AudioRow } from '../../audio/engine'
import { useAudioState } from '../../audio/useAudio'
import '../audio/audio.css'
import Icon from '../Icon'

export default function AudioTab({ campaignId }: { campaignId: number }) {
  const [rows, setRows] = useState<AudioRow[]>([])
  const [err, setErr] = useState('')
  const st = useAudioState()

  useEffect(() => {
    list<AudioRow>('audio', { campaign_id: campaignId, library: true }).then(setRows).catch((e) => setErr(e.message))
  }, [campaignId])

  const tracks = rows.filter((r) => r.kind === 'track')
  const ambs = rows.filter((r) => r.kind === 'ambient')
  const sfx = rows.filter((r) => r.kind === 'sfx').slice(0, 9)
  useEffect(() => { audioEngine.setSfxBoard(sfx); return () => audioEngine.setSfxBoard([]) }, [rows]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx">
      {err && <div className="error">{err}</div>}
      <div className="mx-master">
        <span className="mx-k">Master</span>
        <input className="au-range" type="range" min={0} max={1} step={0.05} value={st.master} aria-label="Volume master"
          onChange={(e) => audioEngine.setMaster(Number(e.target.value))} />
        <span className="mx-v mono">{Math.round(st.master * 100)}</span>
        <button className="btn sm btn-danger" onClick={() => audioEngine.stopAll()}><Icon name="stop" size={12} /> Parar tudo</button>
      </div>

      <section className="mx-sec">
        <h4>Trilha</h4>
        <div className={`mx-now${st.track ? ' on' : ''}`}>
          <button className="mx-play" disabled={!st.track} onClick={() => audioEngine.stopTrack()} title="Parar trilha" aria-label="Parar trilha"><Icon name={st.track ? 'stop' : 'play'} size={14} /></button>
          <div className="mx-nm">{st.track ? st.track.name : <span className="mx-off">Nenhuma tocando</span>}</div>
          {st.track && <input className="au-range" type="range" min={0} max={1} step={0.05} value={st.track.volume} aria-label="Volume da trilha"
            onChange={(e) => audioEngine.setTrackVolume(Number(e.target.value))} />}
        </div>
        {tracks.length === 0 && <div className="mx-off">Sem trilhas na biblioteca.</div>}
        <div className="mx-list">
          {tracks.map((t) => (
            <button key={t.id} className={`mx-item${st.track?.id === t.id ? ' on' : ''}`} onClick={() => audioEngine.playTrack(t)}>
              <Icon name={st.track?.id === t.id ? 'audio' : 'play'} size={12} /><span>{t.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-sec">
        <h4>Ambientes</h4>
        {ambs.length === 0 && <div className="mx-off">Sem ambientes.</div>}
        {ambs.map((a) => {
          const on = st.ambients.find((x) => x.id === a.id)
          return (
            <div key={a.id} className={`mx-amb${on ? ' on' : ''}`}>
              <button className={`sw${on ? ' on' : ''}`} role="switch" aria-checked={!!on} aria-label={`Ambiente ${a.name}`} onClick={() => audioEngine.toggleAmbient(a)}><i /></button>
              <span className="mx-an">{a.name}</span>
              <input className="au-range" type="range" min={0} max={1} step={0.05} disabled={!on} value={on?.volume ?? a.volume ?? 0.8} aria-label={`Volume de ${a.name}`}
                onChange={(e) => audioEngine.setAmbientVolume(a.id, Number(e.target.value))} />
            </div>
          )
        })}
      </section>

      <section className="mx-sec">
        <h4>Efeitos <span className="mx-off">teclas 1–9</span></h4>
        {sfx.length === 0 && <div className="mx-off">Sem efeitos.</div>}
        <div className="au-sfx">
          {sfx.map((s, i) => (
            <button key={s.id} className="au-pad" onClick={() => audioEngine.playSfx(s)}>
              <kbd>{i + 1}</kbd><span>{s.name}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
