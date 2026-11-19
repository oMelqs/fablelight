import { useContext, useEffect, useRef, useState } from 'react'
import { create, getJson, list, postJson, remove, uploadFile } from '../api'
import BookReader from '../components/books/BookReader'
import { Del } from '../components/editor/ed'
import '../components/editor/ed.css'
import Icon from '../components/Icon'
import { WsContext } from '../workspace/ctx'
import { notifyItems } from '../workspace/data'

type Book = { id: number; title: string; kind: 'md' | 'pdf'; file_path: string; campaign_id: number | null; chunks?: number; first?: number }

export default function Livros() {
  const ws = useContext(WsContext)
  const [books, setBooks] = useState<Book[]>([])
  const [camps, setCamps] = useState<Record<number, string>>({})
  const [open, setOpen] = useState<Book | null>(null)
  const [path, setPath] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const file = useRef<HTMLInputElement>(null)

  const load = async () => {
    const [b, c] = await Promise.all([list<Book>('books'), list<any>('campaigns')])
    const rows = await Promise.all(b.map((x) => getJson<any[]>(`/api/books/${x.id}/chunks`)))
    setBooks(b.map((x, i) => ({ ...x, chunks: rows[i].length, first: rows[i][0]?.id })))
    setCamps(Object.fromEntries(c.map((x) => [x.id, x.name])))
  }
  useEffect(() => { load().catch((e) => setErr(e.message)) }, [])

  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label); setErr('')
    try { await fn(); await load(); notifyItems() } catch (e: any) { setErr(e.message) } finally { setBusy('') }
  }
  const upload = (f: File) => act('Importando…', async () => {
    const { path } = await uploadFile(f)
    const b = await create<Book>('books', { title: f.name.replace(/\.[^.]+$/, ''), kind: /\.pdf$/i.test(f.name) ? 'pdf' : 'md', file_path: path })
    await postJson(`/api/books/${b.id}/import`)
  })
  const read = (b: Book) => (ws && b.first ? ws.open({ type: 'book', ref: `${b.id}:${b.first}`, title: b.title }) : setOpen(b))

  if (open?.first) return (
    <div className="lib">
      <div className="lib-bar"><button className="btn" onClick={() => setOpen(null)}><Icon name="back" size={14} />Livros</button><h1>{open.title}</h1></div>
      <div className="lib-page"><BookReader bookId={open.id} chunkId={open.first} /></div>
    </div>
  )

  return (
    <div className="ed lib-page"><div className="ed-in wide">
      <header className="ed-head">
        <h1 style={{ fontSize: 28, letterSpacing: '-.02em' }}>Livros</h1>
      </header>
      {err && <div className="ed-err">{err}</div>}
      <div className="ed-card">
        <div className="row wrap">
          <input ref={file} type="file" accept=".md,.markdown,.txt,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
          <button className="btn btn-primary" disabled={!!busy} onClick={() => file.current?.click()}><Icon name="plus" size={13} />Enviar MD ou PDF</button>
          <input className="input" style={{ flex: '1 1 240px', fontFamily: 'var(--mono)', fontSize: 12 }} aria-label="Caminho no disco" placeholder="/caminho/absoluto/livro.pdf" value={path} onChange={(e) => setPath(e.target.value)} />
          <button className="btn" disabled={!!busy || !path.trim()} onClick={() => act('Importando…', async () => { await postJson('/api/books/import-path', { path: path.trim(), title: '' }); setPath('') })}>Importar do disco</button>
        </div>
        {busy && <div className="muted" aria-live="polite">{busy}</div>}
      </div>
      {!books.length && <div className="ed-empty">Nenhum livro ainda. Envie um arquivo Markdown ou PDF para pesquisar e ler aqui.</div>}
      <div className="lib-grid">
        {books.map((b) => (
          <div key={b.id} className="ed-card lib-camp">
            <div className="row nowrap" style={{ alignItems: 'flex-start' }}>
              <span className="lib-mark"><Icon name="books" size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}><h3 style={{ fontSize: 15 }}>{b.title}</h3>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{b.chunks} trechos · {b.campaign_id ? camps[b.campaign_id] ?? `Campanha ${b.campaign_id}` : 'Biblioteca'}</div></div>
              <span className="lib-kind">{b.kind}</span>
            </div>
            <div className="row">
              <button className="btn btn-primary" disabled={!b.first} onClick={() => read(b)}>Ler</button>
              <button className="btn btn-ghost" disabled={!!busy} onClick={() => act('Reindexando…', () => postJson(`/api/books/${b.id}/import`))}>Reindexar</button>
              <span className="spacer" />
              <Del label="Excluir" icon={false} onYes={() => act('Excluindo…', () => remove('books', b.id))} />
            </div>
          </div>
        ))}
      </div>
    </div></div>
  )
}
