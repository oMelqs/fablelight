// Global audio engine (singleton, lives outside React so audio survives page changes).
import type { AudioPreset } from '../../shared/types'
import { ambientDiff, clamp01, parseYouTubeId } from './helpers'

export interface AudioRow {
  id: number; name: string; kind: 'track' | 'ambient' | 'sfx'; source: 'file' | 'youtube'
  url?: string | null; file_path?: string | null; volume?: number | null; loop?: number | boolean | null
}

export interface AudioState {
  track: { id: number; name: string; volume: number } | null
  ambients: { id: number; volume: number; playing: boolean }[]
  master: number
  ytReady: boolean
}

const FADE_MS = 2000
const baseVol = (a: AudioRow) => clamp01(a.volume ?? 0.8)

// ---- backends -------------------------------------------------------------
interface Backend { setVol(v: number): void; play(): void; stop(): void }

function fileBackend(src: string, loop: boolean): Backend {
  const el = new Audio(src)
  el.loop = loop
  return {
    setVol: (v) => { el.volume = v },
    play: () => { el.play().catch(() => {}) },
    stop: () => { el.pause(); el.removeAttribute('src'); el.load() },
  }
}

let ytPromise: Promise<any> | null = null
function loadYT(): Promise<any> {
  const w = window as any
  if (w.YT?.Player) { ytReady = true; return Promise.resolve(w.YT) }
  return (ytPromise ??= new Promise((res) => {
    const prev = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => { prev?.(); ytReady = true; emit(); res(w.YT) }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(s)
  }))
}
let ytReady = false

let ytBox: HTMLDivElement | null = null
function ytBackend(videoId: string, loop: boolean): Backend {
  if (!ytBox) {
    ytBox = document.createElement('div')
    ytBox.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden'
    document.body.appendChild(ytBox)
  }
  let player: any
  let dead = false
  const ready = loadYT().then((YT) => new Promise<void>((res) => {
    const host = document.createElement('div')
    ytBox!.appendChild(host)
    player = new YT.Player(host, {
      videoId, width: '1', height: '1', playerVars: { playsinline: 1, controls: 0 },
      events: {
        onReady: () => res(),
        onStateChange: (e: any) => { if (e.data === 0 && loop && !dead) { player.seekTo(0); player.playVideo() } },
      },
    })
  }))
  const run = (fn: () => void) => ready.then(() => { if (!dead) try { fn() } catch {} })
  return {
    setVol: (v) => run(() => player.setVolume(Math.round(v * 100))),
    play: () => run(() => player.playVideo()),
    stop: () => { dead = true; ready.then(() => { try { player.destroy() } catch {} }) },
  }
}

// ---- voices ---------------------------------------------------------------
let master = 1
const voices = new Set<Voice>()

class Voice {
  gain = 1
  private timer?: number
  private b: Backend
  constructor(public row: AudioRow, public level: number, loop: boolean) {
    const id = row.source === 'youtube' ? parseYouTubeId(row.url ?? '') : null
    const src = row.file_path || row.url || ''
    this.b = id ? ytBackend(id, loop) : fileBackend(src, loop)
    voices.add(this)
    this.apply()
  }
  apply() { this.b.setVol(clamp01(this.level * this.gain * master)) }
  play(fadeIn = false) {
    if (fadeIn) { this.gain = 0; this.apply() }
    this.b.play()
    if (fadeIn) this.fade(1, FADE_MS)
  }
  fade(to: number, ms: number, done?: () => void) {
    clearInterval(this.timer)
    const from = this.gain, t0 = Date.now()
    this.timer = window.setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / ms)
      this.gain = from + (to - from) * k
      this.apply()
      if (k >= 1) { clearInterval(this.timer); done?.() }
    }, 50)
  }
  stop() { clearInterval(this.timer); this.b.stop(); voices.delete(this) }
  fadeOut() { this.fade(0, FADE_MS, () => this.stop()) }
}

// ---- engine ---------------------------------------------------------------
let track: Voice | null = null
const ambients = new Map<number, Voice>()
let sfxBoard: AudioRow[] = []
let keysBound = false
const listeners = new Set<() => void>()
let state: AudioState = snapshot()

function snapshot(): AudioState {
  return {
    track: track ? { id: track.row.id, name: track.row.name, volume: track.level } : null,
    ambients: [...ambients].map(([id, v]) => ({ id, volume: v.level, playing: true })),
    master, ytReady,
  }
}
function emit() { state = snapshot(); listeners.forEach((f) => f()) }

function bindKeys() {
  if (keysBound) return
  keysBound = true
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || !/^[1-9]$/.test(e.key)) return
    const t = e.target as HTMLElement | null
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
    const row = sfxBoard[Number(e.key) - 1]
    if (row) audioEngine.playSfx(row)
  })
}

export const audioEngine = {
  playTrack(a: AudioRow) {
    if (track?.row.id === a.id) return
    track?.fadeOut()
    track = new Voice(a, baseVol(a), true)
    track.play(true)
    emit()
  },
  stopTrack() { track?.fadeOut(); track = null; emit() },
  toggleAmbient(a: AudioRow, volume?: number) {
    const cur = ambients.get(a.id)
    if (cur) { cur.stop(); ambients.delete(a.id) }
    else { const v = new Voice(a, clamp01(volume ?? baseVol(a)), true); ambients.set(a.id, v); v.play() }
    emit()
  },
  setAmbientVolume(id: number, volume: number) {
    const v = ambients.get(id)
    if (v) { v.level = clamp01(volume); v.apply(); emit() }
  },
  setTrackVolume(volume: number) { if (track) { track.level = clamp01(volume); track.apply(); emit() } },
  playSfx(a: AudioRow) {
    const v = new Voice(a, baseVol(a), false)
    v.play()
    // ponytail: sfx voices are never reaped until stopAll (small leak per shot); add an ended hook if sessions get long
  },
  setMaster(v: number) { master = clamp01(v); voices.forEach((x) => x.apply()); emit() },
  /** Register the sfx grid (keys 1–9 fire items 0–8). Pass [] on unmount. */
  setSfxBoard(rows: AudioRow[]) { sfxBoard = rows; bindKeys() },
  /** Apply a scene preset: crossfade to its track and replace ambient layers. */
  applyPreset(preset: AudioPreset, rows: AudioRow[]) {
    const byId = new Map(rows.map((r) => [r.id, r]))
    const t = preset.track != null ? byId.get(preset.track) : undefined
    if (t) audioEngine.playTrack(t)
    const d = ambientDiff([...ambients.keys()], preset.ambients ?? [], new Set(byId.keys()))
    for (const id of d.stop) { ambients.get(id)?.stop(); ambients.delete(id) }
    for (const { id, volume } of d.start) { const v = new Voice(byId.get(id)!, clamp01(volume), true); ambients.set(id, v); v.play() }
    for (const { id, volume } of d.update) { const v = ambients.get(id)!; v.level = clamp01(volume); v.apply() }
    emit()
  },
  stopAll() {
    track = null; ambients.clear()
    ;[...voices].forEach((v) => v.stop())
    emit()
  },
  getState: () => state,
  subscribe(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn) } },
}
