import { useEffect, useRef, useState } from 'react'
import { create, getJson, list, postJson, remove, uploadFile } from '../api'
import BookReader from '../components/books/BookReader'
import { Del } from '../components/editor/ed'
import '../components/editor/ed.css'
import { Cover, Empty, LIcon, coverFor, scopeName, typing, useCampaigns } from '../library/ui'
import '../library/library.css'
import { notifyItems } from '../workspace/data'

type Book = { id: number; title: string; kind: 'md' | 'pdf'; file_path: string; campaign_id: number | null; chunks: number; first?: number; pages: number }
type Hit = { chunk_id: number; book_id: number; book_title: string; heading: string | null; page: number | null; snippet: string }

export default function Livros() {
  const camps = useCampaigns()
  const [books, setBooks] = useState<Book[]>([])
  const [loaded, setLoaded] = useState(false)
  const [sel, setSel] = useState<number>()
  const [chunk, setChunk] = useState<number>()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[] | null>(null)
  const [imp, setImp] = useState(false)
  const [path, setPath] = useState('')
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const file = useRef<HTMLInputElement>(null)

  const load = async () => {
    const b = await list<any>('books')
    const rows = await Promise.all(b.map((x) => getJson<any[]>(`/api/books/${x.id}/chunks`)))
    const next: Book[] = b.map((x, i) => ({ ...x, chunks: rows[i].length, first: rows[i][0]?.id, pages: Math.max(0, ...rows[i].map((r) => r.page ?? 0)) }))
    setBooks(next); setLoaded(true)
    setSel((s) => (next.some((x) => x.id === s) ? s : next[0]?.id))
  }
  useEffect(() => { load().catch((e) => setErr(e.message)) }, [])
  const book = books.find((b) => b.id === sel)

  useEffect(() => {
    const n = q.trim()
    if (n.length < 2) { setHits(null); return }
    const t = setTimeout(() => getJson<any[]>(`/api/search?q=${encodeURIComponent(n)}&limit=60`).then((r) => setHits(r.filter((x) => x.type === 'book')), (e) => setErr(e.message)), 200)
    return () => clearTimeout(t)
  }, [q])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey) return
      if (e.key === '/') { e.preventDefault(); document.getElementById('lb-lq')?.focus() }
      if (e.key === 'i') setImp((v) => !v)
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [])

  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label); setErr(''); setInfo('')
    try { await fn(); await load(); notifyItems() } catch (e: any) { setErr(e.message) } finally { setBusy('') }
  }
  const upload = (f: File) => act('Enviando e indexando…', async () => {
    const { path } = await uploadFile(f)
    const b = await create<Book>('books', { title: f.name.replace(/\.[^.]+$/, ''), kind: /\.pdf$/i.test(f.name) ? 'pdf' : 'md', file_path: path })
    const r = await postJson<{ chunks: number }>(`/api/books/${b.id}/import`)
    setSel(b.id); setChunk(undefined); setInfo(`“${b.title}” indexado: ${r.chunks} trechos.`)
  })
  const fromDisk = () => act('Lendo e indexando…', async () => {
    const b = await postJson<Book>('/api/books/import-path', { path: path.trim(), title: '' })
    setPath(''); setSel(b.id); setChunk(undefined); setInfo(`“${b.title}” importado.`)
  })
  const select = (id: number) => { setSel(id); setChunk(undefined); setQ('') }

  const importPanel = (big?: boolean) => (
    <div className={big ? 'lb-card' : 'lb-imp'} style={big ? { maxWidth: 720, margin: '0 auto', padding: 22, display: 'grid', gap: 14 } : undefined}>
      {big && <div style={{ textAlign: 'center' }}><h3 style={{ fontSize: 20 }}>Importe seu primeiro livro</h3><p className="muted" style={{ marginTop: 4 }}>PDF ou Markdown. O texto é indexado localmente para busca em mesa.</p></div>}
      <input ref={file} type="file" accept=".md,.markdown,.txt,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
      <button type="button" className={`lb-drop${over ? ' over' : ''}`} disabled={!!busy} onClick={() => file.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) upload(f) }}>
        <LIcon name="upload" size={20} /><b>Solte PDF ou .md aqui</b><span>ou escolha um arquivo</span>
      </button>
      <div className="lb-pad" style={{ padding: 0, justifyContent: 'center', gap: 8 }}>
        <span className="lb-lbl">Ou informe um caminho no disco</span>
        <div className="lb-row">
          <input className="input mono" style={{ flex: 1, fontSize: 12 }} aria-label="Caminho no disco" placeholder="/Users/voce/Livros/guia-do-mestre.pdf" value={path} onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && path.trim() && !busy) fromDisk() }} />
          <button className="btn" disabled={!!busy || !path.trim()} onClick={fromDisk}><LIcon name="folder" size={14} />Importar</button>
        </div>
        <div className={`lb-prog${busy ? ' ind' : ''}`}><i style={busy ? undefined : { width: 0 }} /></div>
        {busy && <span className="lb-faint" aria-live="polite">{busy}</span>}
      </div>
    </div>
  )

  const total = books.reduce((n, b) => n + b.chunks, 0)
  return (
    <div className="lb">
      <div className="lb-tb">
        <h2>Livros</h2>
        <div className="lb-search"><LIcon name="search" size={14} />
          <input id="lb-lq" className="input" type="search" aria-label="Buscar em todos os livros" placeholder="Buscar em todos os livros…  /" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <span className="sp" />
        <span className="lb-faint mono" style={{ fontSize: 12 }}>{books.length} livros · {total} trechos</span>
        <button className="btn btn-primary" aria-pressed={imp} onClick={() => setImp((v) => !v)}><LIcon name="upload" size={14} />Importar<span className="kbd">I</span></button>
      </div>
      {err && <div className="error lb-err" role="alert">{err}</div>}
      {info && !err && <div className="lb-pill ok" style={{ margin: '10px 18px 0', alignSelf: 'flex-start' }} aria-live="polite">{info}</div>}
      {imp && loaded && books.length > 0 && importPanel()}
      {loaded && !books.length ? <div className="lb-scroll" style={{ padding: '60px 40px' }}>{importPanel(true)}</div> : <>
        <div className="lb-shelf">
          <div className="lb-books" role="group" aria-label="Estante">
            {books.map((b) => (
              <button key={b.id} className="lb-spine" aria-pressed={sel === b.id} title={b.title} aria-label={`${b.title}, ${b.chunks} trechos`}
                style={{ height: Math.round(150 + Math.min(1, b.chunks / 120) * 80) }} onClick={() => select(b.id)}>
                <Cover pattern={coverFor(b.id).pattern} tone={coverFor(b.id).tone} viewBox="0 0 52 150" />
                <span className="lb-kind lb-skind">{b.kind}</span>
                <span className="lb-stitle" lang="pt-BR">{b.title}</span>
                <span className="lb-sbands" aria-hidden="true" />
              </button>
            ))}
            <button className="lb-spine add" aria-label="Importar livro" title="Importar livro" onClick={() => setImp(true)}><LIcon name="plus" size={18} /></button>
          </div>
        </div>
        {book && (
          <div className="lb-bhead">
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{book.title}</b>
              <div className="lb-faint mono" style={{ fontSize: 11.5 }}>{book.kind.toUpperCase()} · {book.chunks} trechos{book.pages ? ` · ${book.pages} páginas` : ''} · {scopeName(camps, book.campaign_id)}</div>
            </div>
            <button className="btn" disabled={!!busy} onClick={() => act('Reindexando…', async () => { const r = await postJson<{ chunks: number }>(`/api/books/${book.id}/import`); setInfo(`Reindexado: ${r.chunks} trechos.`) })}>
              <LIcon name="refresh" size={14} className={busy.startsWith('Reindex') ? 'lb-spin' : ''} />{busy.startsWith('Reindex') ? 'Reindexando…' : 'Reindexar'}</button>
            <Del label="Excluir" ask="Excluir livro e índice" onYes={() => act('Excluindo…', () => remove('books', book.id))} />
          </div>
        )}
        <div className="lb-read">
          {hits ? (
            <div className="lb-hits" aria-live="polite">
              <div className="lb-faint" style={{ padding: '6px 10px 8px', fontSize: 12 }}>{hits.length} resultados em {new Set(hits.map((h) => h.book_id)).size} livros</div>
              {hits.map((h) => (
                <button key={h.chunk_id} className="lb-hit" onClick={() => { setSel(h.book_id); setChunk(h.chunk_id); setQ('') }}>
                  <small>{h.book_title}{h.heading ? ` · ${h.heading.split(' › ').pop()}` : ''}{h.page != null ? ` · p. ${h.page}` : ''}</small>
                  <span className="sn" dangerouslySetInnerHTML={{ __html: h.snippet }} />
                </button>
              ))}
              {!hits.length && <p className="muted" style={{ padding: 20 }}>Nada encontrado.</p>}
            </div>
          ) : book?.first
            ? <BookReader key={`${book.id}:${chunk ?? book.first}`} bookId={book.id} chunkId={chunk ?? book.first} />
            : book && <Empty icon="books" title="Livro sem trechos"><p>Reindexe para extrair o texto.</p></Empty>}
        </div>
      </>}
    </div>
  )
}
