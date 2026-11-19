import { useContext, useEffect, useState } from 'react'
import { getJson } from '../../api'
import ChunkView, { Snippet } from '../books/ChunkView'
import '../books/books.css'
import Icon from '../Icon'
import { WsContext } from '../../workspace/ctx'

export default function BooksTab({ campaignId }: { campaignId: number }) {
  const ws = useContext(WsContext)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<any[]>([])
  const [open, setOpen] = useState<{ bookId: number; chunkId: number } | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!q.trim()) { setHits([]); return }
    const t = setTimeout(() => {
      getJson<any[]>(`/api/search?q=${encodeURIComponent(q)}&campaign_id=${campaignId}&limit=30`)
        .then((r) => { setHits(r.filter((h) => h.type === 'book')); setErr('') }, (e) => setErr(e.message))
    }, 250)
    return () => clearTimeout(t)
  }, [q, campaignId])

  // With a workspace the result opens as a `book` tab; without one it reads inline.
  const go = (h: any) => ws ? ws.open({ type: 'book', ref: `${h.book_id}:${h.chunk_id}`, title: h.heading || h.book_title }) : setOpen({ bookId: h.book_id, chunkId: h.chunk_id })

  return (
    <div className="bk-tab">
      <div className="bk-search">
        <Icon name="search" size={14} />
        <input placeholder="Buscar nos livros…" aria-label="Buscar nos livros" value={q} onChange={(e) => { setQ(e.target.value); setOpen(null) }} />
        {hits.length > 0 && <span className="bk-n mono">{hits.length}</span>}
      </div>
      {err && <div className="error">{err}</div>}
      {open ? (
        <ChunkView bookId={open.bookId} chunkId={open.chunkId} onNav={(id) => setOpen({ ...open, chunkId: id })} onBack={() => setOpen(null)} />
      ) : (
        <div className="bk-list">
          {!q.trim() && <div className="empty">Digite para buscar regras, tabelas e trechos nos livros da campanha.</div>}
          {q.trim() && !hits.length && !err && <div className="empty">Nada encontrado.</div>}
          {hits.map((h) => (
            <button key={h.chunk_id} className="bk-row" onClick={() => go(h)}>
              <div className="bk-rh"><span className="bk-hd">{h.heading || h.book_title}</span>{h.page ? <span className="bk-pg mono">p. {h.page}</span> : null}</div>
              <div className="bk-bk">{h.book_title}</div>
              <Snippet html={h.snippet} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
