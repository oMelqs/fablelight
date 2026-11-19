import { useCallback, useEffect, useState } from 'react'
import { list } from '../api'
import { listen } from './util'
import type { PanelType } from './layout'

export interface Sess { id: number; number: number | null; title: string | null; status: string }
export interface Scn { id: number; title: string; session_id: number | null; ord: number; encounter_id: number | null }
export interface Items {
  sessions: Sess[]
  scenes: Scn[]
  encounters: { id: number; name: string }[]
  characters: { id: number; name: string; kind: 'pc' | 'npc'; player: string | null }[]
  notes: { id: number; title: string | null; body: string }[]
  creatures: { id: number; name: string; tier: string | null }[]
  books: { id: number; title: string }[]
  systems: { id: number; name: string }[]
}
const EMPTY: Items = { sessions: [], scenes: [], encounters: [], characters: [], notes: [], creatures: [], books: [], systems: [] }

export const notifyItems = () => window.dispatchEvent(new CustomEvent('rpgtable:items'))

/** Everything the explorer and /abrir need, refreshed on `rpgtable:items`, on focus and every few seconds. */
export function useItems(cid: number) {
  const [items, setItems] = useState<Items>(EMPTY)
  const load = useCallback(() => {
    const q = { campaign_id: cid }
    Promise.all([
      list('sessions', q), list('scenes', q), list('encounters', q), list('characters', q), list('notes', q),
      list('creatures', { ...q, library: true }), list('books', q), list('systems'),
    ]).then(([sessions, scenes, encounters, characters, notes, creatures, books, systems]) =>
      setItems({ sessions: sessions.sort((a, b) => (a.number ?? 1e9) - (b.number ?? 1e9) || a.id - b.id), scenes, encounters, characters, notes, creatures, books, systems })).catch(() => {})
  }, [cid])
  useEffect(() => {
    load()
    const off = listen('rpgtable:items', load)
    const t = setInterval(load, 8000)
    window.addEventListener('focus', load)
    return () => { off(); clearInterval(t); window.removeEventListener('focus', load) }
  }, [load])
  return { items, reload: load }
}

/** Display title for an editor tab, from live data; falls back to the stored title. */
export function titleFor(items: Items, type: PanelType, ref: number | string | undefined, fallback?: string): string {
  const id = Number(ref)
  const t = (v: string | null | undefined, d: string) => (v && v.trim() ? v : d)
  switch (type) {
    case 'scene-edit': return t(items.scenes.find((s) => s.id === id)?.title, fallback ?? 'Cena')
    case 'session': { const s = items.sessions.find((x) => x.id === id); return s ? `Sessão ${s.number ?? ''}`.trim() + (s.title ? ` — ${s.title}` : '') : fallback ?? 'Sessão' }
    case 'encounter': return t(items.encounters.find((x) => x.id === id)?.name, fallback ?? 'Encontro')
    case 'character': return t(items.characters.find((x) => x.id === id)?.name, fallback ?? 'Personagem')
    case 'note': { const n = items.notes.find((x) => x.id === id); return t(n?.title || n?.body?.slice(0, 28), fallback ?? 'Nota') }
    case 'creature': return t(items.creatures.find((x) => x.id === id)?.name, fallback ?? 'Criatura')
    case 'system': return t(items.systems.find((x) => x.id === id)?.name, fallback ?? 'Sistema')
    case 'book': return fallback ?? 'Livro'
    default: return PANEL_TITLES[type]
  }
}

export const PANEL_TITLES: Record<PanelType, string> = {
  log: 'Registro', scene: 'Cena', combat: 'Combate', calc: 'Calculadora', books: 'Livros', audio: 'Áudio', party: 'Grupo',
  'scene-edit': 'Cena', encounter: 'Encontro', character: 'Personagem', creature: 'Criatura', note: 'Nota', session: 'Sessão', book: 'Livro', system: 'Sistema',
  'library-systems': 'Sistemas', 'library-bestiary': 'Bestiário', 'library-books': 'Livros (biblioteca)', 'library-audio': 'Áudio (biblioteca)',
}
export const PANEL_ICONS: Record<PanelType, string> = {
  log: 'log', scene: 'scene', combat: 'sword', calc: 'dice', books: 'books', audio: 'audio', party: 'users',
  'scene-edit': 'scene', encounter: 'encounter', character: 'pc', creature: 'bestiary', note: 'note', session: 'campaigns', book: 'books', system: 'systems',
  'library-systems': 'systems', 'library-bestiary': 'bestiary', 'library-books': 'books', 'library-audio': 'audio',
}
