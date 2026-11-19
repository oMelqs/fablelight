import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getJson } from '../../api'
import ChunkView, { Snippet } from './ChunkView'
import './books.css'

const GROUPS: Record<string, string> = { book: 'Livros', note: 'Notas', scene: 'Cenas', creature: 'Criaturas', character: 'Personagens' }

export default function SearchPalette() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<any[]>([])
  const [sel, setSel] = useState(0)
  const [chunk, setChunk] = useState<{ bookId: number; chunkId: number } | null>(null)
  const nav = useNavigate()
  const { pathname } = useLocation()
  const cid = /^\/c\/(\d+)/.exec(pathname)?.[1]
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o) }
    }
    addEventListener('keydown', h)
    return () => removeEventListener('keydown', h)
  }, [])

  useEffect(() => { if (open) { setChunk(null); setTimeout(() => input.current?.focus(), 0) } }, [open])
  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open || !q.trim()) { setHits([]); return }
    const t = setTimeout(() => {
      getJson<any[]>(`/api/search?q=${encodeURIComponent(q)}${cid ? `&campaign_id=${cid}` : ''}&limit=40`)
        .then((r) => { setHits(r); setSel(0) }, () => setHits([]))
    }, 200)
    return () => clearTimeout(t)
  }, [q, cid, open])

  // flat order grouped by type so arrow keys follow what is on screen
  const ordered = useMemo(() => Object.keys(GROUPS).flatMap((t) => hits.filter((h) => h.type === t)), [hits])

  const choose = (h: any) => {
    if (h.type === 'book') return setChunk({ bookId: h.book_id, chunkId: h.chunk_id })
    const to = { note: `/c/${cid}/notas`, scene: `/c/${cid}/prep`, character: `/c/${cid}/personagens`, creature: '/biblioteca/bestiario' }[h.type as string]
    if (to) { nav(to); setOpen(false) }
  }

  if (!open) return null
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); chunk ? setChunk(null) : setOpen(false) }
    else if (chunk) return
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, ordered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter' && ordered[sel]) choose(ordered[sel])
  }

  return (
    <div className="bk-overlay" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)} onKeyDown={onKey}>
      <div className="bk-palette">
        <input ref={input} className="input" placeholder={cid ? 'Buscar em livros, notas, cenas, criaturas, personagens…' : 'Buscar nos livros…'} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="bk-scroll">
          {chunk ? (
            <ChunkView bookId={chunk.bookId} chunkId={chunk.chunkId} onNav={(id) => setChunk({ ...chunk, chunkId: id })} onBack={() => setChunk(null)} />
          ) : (
            <>
              {q.trim() && !ordered.length && <div className="muted">Nada encontrado.</div>}
              {Object.entries(GROUPS).map(([t, label]) => {
                const g = ordered.filter((h) => h.type === t)
                return g.length ? (
                  <div key={t}>
                    <div className="bk-group">{label}</div>
                    <div className="stack-sm">
                      {g.map((h) => (
                        <button key={`${t}${h.chunk_id ?? h.id}`} className={'bk-result' + (ordered[sel] === h ? ' sel' : '')} onMouseEnter={() => setSel(ordered.indexOf(h))} onClick={() => choose(h)}>
                          <div className="bk-title">{t === 'book' ? h.heading || h.book_title : h.title}</div>
                          {t === 'book' && <div className="muted">{h.book_title}{h.page ? ` · p. ${h.page}` : ''}</div>}
                          <Snippet html={h.snippet} />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
