import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { create, list, remove, update, uploadFile } from '../api'
import { audioEngine } from '../audio/engine'
import { parseYouTubeId } from '../audio/helpers'
import { useAudioState } from '../audio/useAudio'
import { useAutosave } from '../components/combat/useAutosave'
import type { AudioItem } from '../components/audio/AudioForm'
import { Del, Seg, TagInput } from '../components/editor/ed'
import '../components/editor/ed.css'
import '../library/library.css'
import { notifyItems } from '../workspace/data'
import { Chip, Empty, LIcon, scopeName, typing, useCampaigns, type Camp } from '../library/ui'

type Item = AudioItem & { loop?: number | null }
type Kind = Item['kind']
type SceneRow = { id: number; title: string; campaign_id: number; audio_preset: { track?: number; ambients?: { id: number }[] } }
const KINDS: [Kind, string][] = [['track', 'Trilhas'], ['ambient', 'Ambientes'], ['sfx', 'Efeitos']]
const tagsOf = (a: Item) => (a.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean)

/** Decorative waveform, stable per id. */
function Wave({ id, h = 34 }: { id: number; h?: number }) {
  const bars = Array.from({ length: 48 }, (_, i) => Math.max(3, (0.2 + 0.8 * Math.abs(Math.sin(i * 0.37 + id * 1.7) * Math.cos(i * 0.11 + id * 3.4))) * h))
  return <svg viewBox={`0 0 240 ${h}`} preserveAspectRatio="none" aria-hidden>{bars.map((b, i) => <rect key={i} x={i * 5} y={(h - b) / 2} width={3.4} height={b} rx={1} fill="currentColor" />)}</svg>
}

function Inspector({ item, camps, scenes, onSaved, onDelete }: { item: Item; camps: Camp[]; scenes: SceneRow[]; onSaved: () => void; onDelete: () => void }) {
  const [c, setC] = useState({ name: item.name, volume: item.volume ?? 0.8, loop: !!item.loop, tags: item.tags ?? '', campaign_id: item.campaign_id })
  useAutosave(c, (v) => { update('audio', item.id, { ...v, loop: v.loop ? 1 : 0 }).then(() => { onSaved(); notifyItems() }) })
  const st = useAudioState()
  const set = (p: Partial<typeof c>) => setC((x) => ({ ...x, ...p }))
  const setVol = (v: number) => {
    set({ volume: v })
    if (st.track?.id === item.id) audioEngine.setTrackVolume(v)
    else if (st.ambients.some((a) => a.id === item.id)) audioEngine.setAmbientVolume(item.id, v)
  }
  const used = scenes.filter((s) => s.audio_preset?.track === item.id || s.audio_preset?.ambients?.some((a) => a.id === item.id))
  const origin = item.source === 'youtube' ? item.url : item.file_path
  return (
    <div className="lb-pad">
      <div><span className="lb-lbl">{KINDS.find(([k]) => k === item.kind)?.[1]}</span>
        <input className="lb-big" aria-label="Nome" value={c.name} onChange={(e) => set({ name: e.target.value })} style={{ marginTop: 4 }} /></div>
      <div className="lb-wf" style={{ height: 56, color: 'var(--ac)' }}><Wave id={item.id} h={56} /></div>
      <div className="lb-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div><div className="lb-row"><label className="lb-lbl" style={{ flex: 1 }} htmlFor="au-vol">Volume</label><span className="mono">{Math.round(c.volume * 100)}%</span></div>
          <input id="au-vol" type="range" min={0} max={1} step={0.05} value={c.volume} onChange={(e) => setVol(Number(e.target.value))} style={{ width: '100%', marginTop: 8 }} /></div>
        <div className="lb-row"><span className="lb-lbl" style={{ flex: 1 }}>Repetir em loop</span>
          <button className="lb-sw" role="switch" aria-checked={c.loop} aria-label="Loop" onClick={() => set({ loop: !c.loop })} /></div>
      </div>
      <div><span className="lb-lbl">Tags</span><div style={{ marginTop: 6 }}><TagInput value={c.tags} onChange={(tags) => set({ tags })} /></div></div>
      <div><label className="lb-lbl" htmlFor="au-scope">Escopo</label>
        <select id="au-scope" className="input" style={{ width: '100%', marginTop: 6 }} value={c.campaign_id ?? ''} onChange={(e) => set({ campaign_id: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Biblioteca</option>{camps.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      <div><span className="lb-lbl">Origem</span><div className="mono muted" style={{ fontSize: 11.5, marginTop: 6, wordBreak: 'break-all' }}>{item.source === 'youtube' ? 'YouTube · ' : 'Arquivo · '}{origin ?? '—'}</div></div>
      <div><span className="lb-lbl">Usado em</span>
        <div className="muted" style={{ marginTop: 6 }}>{used.length ? used.map((s) => <div key={s.id}>Cena “{s.title || 'sem título'}” · {scopeName(camps, s.campaign_id)}</div>) : 'Nenhuma cena usa este áudio.'}</div></div>
      <div><Del label="Remover da biblioteca" onYes={onDelete} ask="Remover" /></div>
    </div>
  )
}

export default function Audio({ campaignId }: { campaignId?: number } = {}) {
  const [sp] = useSearchParams()
  const campaign = campaignId ?? (sp.get('campaign') ? Number(sp.get('campaign')) : null)
  const camps = useCampaigns()
  const [items, setItems] = useState<Item[]>([])
  const [scenes, setScenes] = useState<SceneRow[]>([])
  const [tab, setTab] = useState<Kind | 'all'>('all')
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [sel, setSel] = useState<number>()
  const [flash, setFlash] = useState<number>()
  const [showImp, setShowImp] = useState(false)
  const [err, setErr] = useState('')
  const st = useAudioState()
  const search = useRef<HTMLInputElement>(null)

  const load = useCallback(() => list<Item>('audio', campaign ? { campaign_id: campaign, library: true } : {}).then(setItems).catch((e) => setErr(e.message)), [campaign])
  useEffect(() => { load() }, [load])
  useEffect(() => { list<SceneRow>('scenes').then(setScenes).catch(() => {}) }, [])

  const playing = (a: Item) => st.track?.id === a.id || st.ambients.some((x) => x.id === a.id)
  const toggle = (a: Item) => {
    if (a.kind === 'track') playing(a) ? audioEngine.stopTrack() : audioEngine.playTrack(a)
    else if (a.kind === 'ambient') audioEngine.toggleAmbient(a)
    else { audioEngine.playSfx(a); setFlash(a.id); setTimeout(() => setFlash(undefined), 500) }
  }
  const active = (st.track ? 1 : 0) + st.ambients.length
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return
      const s = audioEngine.getState()
      if (e.key === 'Escape' && (s.track || s.ambients.length)) audioEngine.stopAll()
      else if (e.key === '/') { e.preventDefault(); search.current?.focus() }
      else if (e.key === 'i') setShowImp((v) => !v)
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [])

  const topTags = useMemo(() => {
    const n = new Map<string, number>()
    items.forEach((a) => tagsOf(a).forEach((t) => n.set(t, (n.get(t) ?? 0) + 1)))
    return [...n].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t)
  }, [items])
  const needle = q.trim().toLowerCase()
  const shown = items.filter((a) => (tab === 'all' || a.kind === tab) && (!tag || tagsOf(a).includes(tag)) && (!needle || `${a.name} ${a.tags ?? ''}`.toLowerCase().includes(needle)))
  const current = items.find((a) => a.id === sel)
  useEffect(() => { if (!sel && items.length) setSel(items[0].id) }, [items, sel])
  const nameOf = (id: number) => items.find((a) => a.id === id)?.name ?? `#${id}`
  const names = [...(st.track ? [st.track.name] : []), ...st.ambients.map((a) => nameOf(a.id))]

  const card = (a: Item, i: number) => {
    const pl = playing(a)
    return (
      <div key={a.id} className={`lb-ac${a.kind === 'sfx' ? ' lb-sfx' : ''}${pl ? ' playing' : ''}${sel === a.id ? ' sel' : ''}${flash === a.id ? ' lb-flash' : ''}`}
        role="button" tabIndex={0} style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
        onClick={() => { setSel(a.id); if (a.kind === 'sfx') toggle(a) }}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); setSel(a.id); toggle(a) } }}>
        <div className="h">
          <button className="lb-pb" aria-label={pl ? `Parar ${a.name}` : `Tocar ${a.name}`} onClick={(e) => { e.stopPropagation(); setSel(a.id); toggle(a) }}><LIcon name={pl ? 'stop' : 'play'} size={13} /></button>
          <div style={{ minWidth: 0, flex: 1 }}><h4>{a.name}</h4>
            <div className="meta"><LIcon name={a.source === 'youtube' ? 'yt' : 'folder'} size={13} />{a.source === 'youtube' ? 'YouTube' : 'Arquivo'}{a.loop ? <span style={{ marginLeft: 'auto', color: 'var(--acl)' }} title="Em loop"><LIcon name="loop" size={13} /></span> : null}</div></div>
        </div>
        <div className="lb-wf"><Wave id={a.id} /></div>
        <div className="lb-row"><div className="lb-row" style={{ flex: 1, overflow: 'hidden' }}>{tagsOf(a).slice(0, 3).map((t) => <span key={t} className="lb-chip sm">{t}</span>)}</div><span className="mono lb-faint" style={{ fontSize: 11.5 }}>{Math.round((a.volume ?? 0.8) * 100)}%</span></div>
      </div>
    )
  }

  return (
    <div className="lb">
      <div className="lb-tb">
        <h2>Áudio</h2>
        <Seg label="Tipo" value={tab} onChange={setTab} options={[['all', 'Tudo'], ...KINDS.map(([k, l]): [Kind, string] => [k, `${l} ${items.filter((a) => a.kind === k).length}`])]} />
        <input ref={search} className="input" type="search" style={{ width: 190 }} aria-label="Buscar faixa" placeholder="Buscar faixa…  /" value={q} onChange={(e) => setQ(e.target.value)} />
        {topTags.map((t) => <Chip key={t} on={tag === t} onClick={() => setTag(tag === t ? null : t)}>{t}</Chip>)}
        <span className="sp" />
        <button className="btn btn-primary" aria-pressed={showImp} onClick={() => setShowImp((v) => !v)}><LIcon name="upload" size={14} />Importar<span className="kbd">I</span></button>
      </div>
      {err && <div className="error lb-err" role="alert">{err}</div>}
      {showImp && <ImportRow kind={tab === 'all' ? 'track' : tab} campaign={campaign} onDone={(id) => { setShowImp(false); load(); setSel(id); notifyItems() }} />}
      <div className="lb-split" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px' }}>
        <div className="lb-scroll">
          <div className="lb-agrid">
            {!items.length ? <div style={{ gridColumn: '1/-1' }}><Empty icon="audio" title="Nenhum áudio ainda"><p>Importe um arquivo ou cole um link do YouTube.</p>
              <button className="btn btn-primary" onClick={() => setShowImp(true)}><LIcon name="upload" size={14} />Importar áudio</button></Empty></div>
              : !shown.length ? <div className="muted" style={{ gridColumn: '1/-1', padding: 30 }}>Nada neste filtro.</div>
              : tab === 'all' ? KINDS.map(([k, l]) => { const g = shown.filter((a) => a.kind === k); return g.length ? [<div key={k} className="lb-lbl lb-gh">{l} <span className="mono lb-faint">{g.length}</span></div>, ...g.map(card)] : null })
              : shown.map(card)}
          </div>
        </div>
        <aside className="lb-insp" aria-label="Detalhes do áudio">
          {current ? <Inspector key={current.id} item={current} camps={camps} scenes={scenes} onSaved={load}
            onDelete={() => remove('audio', current.id).then(() => { setSel(undefined); load(); notifyItems() }, (e) => setErr(e.message))} />
            : <div className="lb-empty">Selecione um áudio para ver volume, loop, tags e onde é usado.</div>}
        </aside>
      </div>
      {active > 0 && (
        <div className="lb-np" role="region" aria-label="Tocando agora">
          <span className="lb-pill" style={{ background: 'var(--ac2)', color: 'var(--acl)' }}>Tocando {active}</span>
          <div className="nm"><b>{names[0]}</b>{names.length > 1 && <span className="muted"> + {names.slice(1).join(', ')}</span>}</div>
          <div className="lb-row" style={{ width: 150 }}><LIcon name="audio" size={14} /><input type="range" min={0} max={1} step={0.05} value={st.master} aria-label="Volume geral" onChange={(e) => audioEngine.setMaster(Number(e.target.value))} /></div>
          <button className="btn" onClick={() => audioEngine.stopAll()}><LIcon name="pause" size={14} />Parar tudo<span className="kbd">Esc</span></button>
        </div>
      )}
    </div>
  )
}

function ImportRow({ kind: k0, campaign, onDone }: { kind: Kind; campaign: number | null; onDone: (id: number) => void }) {
  const [source, setSource] = useState<'file' | 'youtube'>('file')
  const [kind, setKind] = useState<Kind>(k0)
  const [link, setLink] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [tags, setTags] = useState('')
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const pick = useRef<HTMLInputElement>(null)
  const take = (f?: File | null) => { if (f) { setFile(f); if (!name) setName(f.name.replace(/\.[^.]+$/, '')) } }
  const go = async () => {
    setErr('')
    if (source === 'youtube' && !parseYouTubeId(link)) return setErr('Link do YouTube inválido.')
    if (source === 'file' && !file) return setErr('Escolha um arquivo.')
    if (!name.trim()) return setErr('Informe um título.')
    setBusy(true)
    try {
      const body: Record<string, unknown> = { name: name.trim(), kind, source, tags, volume: 0.8, campaign_id: campaign, loop: kind === 'sfx' ? 0 : 1 }
      if (source === 'youtube') body.url = link.trim(); else body.file_path = (await uploadFile(file!)).path
      onDone((await create<Item>('audio', body)).id)
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="lb-imp" style={{ gridTemplateColumns: 'auto 1fr' }}>
      <Seg label="Origem" value={source} onChange={setSource} options={[['file', 'Arquivo'], ['youtube', 'YouTube']]} />
      <div className="lb-row wrap">
        {source === 'file'
          ? <><input ref={pick} type="file" accept="audio/*" hidden onChange={(e) => take(e.target.files?.[0])} />
              <button className={`lb-drop${over ? ' over' : ''}`} style={{ flex: 1, minHeight: 34, height: 34, flexDirection: 'row', gap: 8, minWidth: 200 }} onClick={() => pick.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]) }}>
                <LIcon name="upload" size={14} />{file ? file.name : 'Solte MP3, OGG ou WAV, ou escolha'}</button></>
          : <input className="input mono" style={{ flex: 1, minWidth: 200 }} aria-label="Link do YouTube" placeholder="https://youtube.com/watch?v=…" value={link} onChange={(e) => setLink(e.target.value)} />}
        <input className="input" style={{ width: 170 }} aria-label="Título" placeholder="Título" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="input" style={{ width: 120 }} aria-label="Tipo" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l.replace(/s$/, '')}</option>)}</select>
        <input className="input" style={{ width: 190 }} aria-label="Tags" placeholder="tags, separadas por vírgula" value={tags} onChange={(e) => setTags(e.target.value)} />
        <button className="btn btn-primary" disabled={busy} onClick={go}>{busy ? 'Adicionando…' : 'Adicionar'}</button>
        {err && <span className="error" role="alert" style={{ flexBasis: '100%' }}>{err}</span>}
      </div>
    </div>
  )
}
