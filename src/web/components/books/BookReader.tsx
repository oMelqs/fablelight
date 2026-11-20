import { useEffect, useRef, useState } from 'react'
import { getJson } from '../../api'
import Icon from '../Icon'
import '../editor/ed.css'
import Markdown from './markdown'
import type { Chunk } from './ChunkView'

type Row = { id: number; heading: string | null; page: number | null }

/** Document-style reader: heading trail, ~70ch measure, chapter outline on wide groups, prev/next bar. */
export default function BookReader({ bookId, chunkId, onNav }: { bookId: number; chunkId: number; onNav?: (id: number) => void }) {
  const [cur, setCur] = useState(chunkId)
  const [c, setC] = useState<Chunk | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [err, setErr] = useState('')
  const top = useRef<HTMLDivElement>(null)
  const go = (id: number) => { setCur(id); onNav?.(id) }

  useEffect(() => { getJson<Row[]>(`/api/books/${bookId}/chunks`).then(setRows, () => {}) }, [bookId])
  useEffect(() => {
    setErr('')
    getJson<Chunk>(`/api/books/${bookId}/chunks/${cur}`).then((x) => { setC(x); top.current?.closest('.pane, .workbench, .lib-main')?.scrollTo({ top: 0 }); top.current?.querySelector('.bkr-doc')?.scrollTo({ top: 0 }) }, (e) => setErr(e.message))
  }, [bookId, cur])
  useEffect(() => { document.querySelector('.bkr-toc button.on')?.scrollIntoView({ block: 'nearest' }) }, [cur, rows.length])

  if (err) return <div className="ed"><div className="ed-in"><div className="ed-err">{err}</div></div></div>
  if (!c) return <div className="ed"><div className="ed-in"><div className="ed-empty">Carregando…</div></div></div>

  const trail = (c.heading ?? '').split(' › ').filter(Boolean)
  const title = trail.pop() ?? c.book.title
  const idx = rows.findIndex((r) => r.id === cur)
  const pdf = c.book.kind === 'pdf'
  return (
    <div className="ed" ref={top}>
      <div className={`bkr${rows.length > 1 ? ' has-toc' : ''}`}>
        <nav className="bkr-toc" aria-label="Capítulos">
          {rows.map((r) => <button key={r.id} className={r.id === cur ? 'on' : ''} onClick={() => go(r.id)}><span className="t">{(r.heading ?? '').split(' › ').pop() || '(sem título)'}</span>{r.page != null && <span className="pg">{r.page}</span>}</button>)}
        </nav>
        <div className="bkr-doc">
          <article className="bkr-art">
            <div className="bkr-crumb"><Icon name="books" size={12} />{c.book.title}{trail.map((t) => <span key={t} className="row nowrap" style={{ gap: 6 }}><Icon name="chevron" size={10} />{t}</span>)}
              {pdf && c.page != null && <><span className="spacer" /><a href={`${c.book.file_path}#page=${c.page}`} target="_blank" rel="noreferrer">Abrir PDF na página {c.page}</a></>}</div>
            <h1>{title}</h1>
            {pdf ? <pre className="bk-plain">{c.text}</pre> : <Markdown text={c.text} />}
          </article>
          <div className="bkr-nav">
            <button className="btn" disabled={!c.prev_id} onClick={() => c.prev_id && go(c.prev_id)}><Icon name="back" size={14} />Anterior</button>
            <span className="mid">{idx >= 0 ? `${idx + 1} / ${rows.length}` : ''}{c.page != null ? ` · p. ${c.page}` : ''}</span>
            <button className="btn" disabled={!c.next_id} onClick={() => c.next_id && go(c.next_id)}>Próximo<Icon name="chevron" size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
