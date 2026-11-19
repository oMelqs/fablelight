import { useEffect, useState } from 'react'
import { getJson } from '../../api'
import Markdown from './markdown'
import './books.css'
import Icon from '../Icon'

export type Chunk = {
  id: number; book_id: number; heading: string | null; page: number | null; text: string
  prev_id: number | null; next_id: number | null; book: { id: number; title: string; kind: 'md' | 'pdf'; file_path: string }
}

/** Reads one chunk with prev/next navigation. */
export default function ChunkView({ bookId, chunkId, onNav, onBack }: { bookId: number; chunkId: number; onNav: (id: number) => void; onBack?: () => void }) {
  const [c, setC] = useState<Chunk | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    setErr('')
    getJson<Chunk>(`/api/books/${bookId}/chunks/${chunkId}`).then(setC, (e) => setErr(e.message))
  }, [bookId, chunkId])
  if (err) return <div className="error">{err}</div>
  if (!c) return <div className="muted">Carregando…</div>
  const pdf = c.book.kind === 'pdf'
  return (
    <div className="stack-sm">
      <div className="bk-nav">
        {onBack && <button className="btn sm" onClick={onBack}><Icon name="back" size={14} /> Resultados</button>}
        <button className="btn sm" disabled={!c.prev_id} onClick={() => c.prev_id && onNav(c.prev_id)}><Icon name="back" size={14} /> Anterior</button>
        <button className="btn sm" disabled={!c.next_id} onClick={() => c.next_id && onNav(c.next_id)}>Próximo <Icon name="chevron" size={14} /></button>
        <span className="spacer" />
        {pdf && c.page != null && <a className="btn sm" href={`${c.book.file_path}#page=${c.page}`} target="_blank" rel="noreferrer">Abrir PDF na página {c.page}</a>}
      </div>
      <div className="bk-crumb">{c.book.title}{c.page != null ? <span className="mono"> · p. {c.page}</span> : null}{c.heading ? ` · ${c.heading}` : ''}</div>
      {pdf ? <pre className="bk-plain">{c.text}</pre> : <Markdown text={c.text} />}
    </div>
  )
}

export function Snippet({ html }: { html: string }) {
  // server escapes all text and only adds <mark>
  return <div className="bk-snip" dangerouslySetInnerHTML={{ __html: html }} />
}
