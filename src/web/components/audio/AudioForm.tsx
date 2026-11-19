import { useState } from 'react'
import { create, update, uploadFile } from '../../api'
import { parseYouTubeId } from '../../audio/helpers'
import './audio.css'

export interface AudioItem {
  id: number; campaign_id: number | null; name: string; kind: 'track' | 'ambient' | 'sfx'
  source: 'file' | 'youtube'; url: string | null; file_path: string | null; tags: string | null; volume: number
}

export default function AudioForm({ item, campaigns, defaultCampaign, onDone }: {
  item?: AudioItem; campaigns: { id: number; name: string }[]; defaultCampaign: number | null; onDone: () => void
}) {
  const [name, setName] = useState(item?.name ?? '')
  const [kind, setKind] = useState(item?.kind ?? 'track')
  const [source, setSource] = useState(item?.source ?? 'file')
  const [link, setLink] = useState(item?.url ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [tags, setTags] = useState(item?.tags ?? '')
  const [volume, setVolume] = useState(item?.volume ?? 0.8)
  const [campaign, setCampaign] = useState<number | null>(item ? item.campaign_id : defaultCampaign)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    setErr('')
    if (!name.trim()) return setErr('Informe um nome.')
    if (source === 'youtube' && !parseYouTubeId(link)) return setErr('Link do YouTube inválido.')
    if (source === 'file' && !file && !item?.file_path) return setErr('Escolha um arquivo.')
    setBusy(true)
    try {
      const body: Record<string, unknown> = { name: name.trim(), kind, source, tags, volume, campaign_id: campaign, loop: kind === 'sfx' ? 0 : 1 }
      if (source === 'youtube') { body.url = link.trim(); body.file_path = null }
      else { if (file) body.file_path = (await uploadFile(file)).path; body.url = null }
      if (item) await update('audio', item.id, body); else await create('audio', body)
      onDone()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="card stack-sm">
      <div className="au-form">
        <label>Nome<input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Tipo
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as any)}>
            <option value="track">Trilha</option><option value="ambient">Ambiente</option><option value="sfx">Efeito</option>
          </select>
        </label>
        <label>Origem
          <select className="input" value={source} onChange={(e) => setSource(e.target.value as any)}>
            <option value="file">Arquivo</option><option value="youtube">YouTube</option>
          </select>
        </label>
        {source === 'youtube'
          ? <label>Link<input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtu.be/..." /></label>
          : <label>Arquivo{item?.file_path && !file ? ` (atual: ${item.file_path})` : ''}
              <input className="input" type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>}
        <label>Tags<input className="input" value={tags ?? ''} onChange={(e) => setTags(e.target.value)} placeholder="taverna, tensão" /></label>
        <label>Volume base ({Math.round(volume * 100)}%)
          <input className="au-range" type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} /></label>
        <label>Escopo
          <select className="input" value={campaign ?? ''} onChange={(e) => setCampaign(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Biblioteca</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      {err && <div className="error">{err}</div>}
      <div className="row">
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Salvando…' : 'Salvar'}</button>
        <button className="btn" onClick={onDone}>Cancelar</button>
      </div>
    </div>
  )
}
