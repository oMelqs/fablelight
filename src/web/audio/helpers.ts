// Pure helpers (no DOM) so they can be unit-tested.
export function parseYouTubeId(input: string): string | null {
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  let u: URL
  try { u = new URL(s) } catch { return null }
  const host = u.hostname.replace(/^(www|m|music)\./, '')
  let id: string | null = null
  if (host === 'youtu.be') id = u.pathname.split('/')[1] ?? null
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/)
    id = m ? m[1] : u.pathname === '/watch' ? u.searchParams.get('v') : null
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null
}

export interface AmbientDiff {
  stop: number[]
  start: { id: number; volume: number }[]
  update: { id: number; volume: number }[]
}

/** Which ambient layers to stop/start/retune to match a preset. Ids not in `knownIds` are ignored. */
export function ambientDiff(playing: number[], wanted: { id: number; volume: number }[], knownIds: Set<number>): AmbientDiff {
  const want = new Map<number, number>()
  for (const w of wanted) if (knownIds.has(w.id)) want.set(w.id, w.volume)
  const cur = new Set(playing)
  return {
    stop: playing.filter((id) => !want.has(id)),
    start: [...want].filter(([id]) => !cur.has(id)).map(([id, volume]) => ({ id, volume })),
    update: [...want].filter(([id]) => cur.has(id)).map(([id, volume]) => ({ id, volume })),
  }
}

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
