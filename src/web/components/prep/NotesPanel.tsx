import { useContext, useState } from 'react'
import { remove, update } from '../../api'
import Markdown from '../books/markdown'
import { Del, Msg, SaveBadge, Seg, TagInput, useDoc, useSaving , useAutosaveEq } from '../editor/ed'
import { WsContext } from '../../workspace/ctx'
import { notifyItems } from '../../workspace/data'

interface Note { id: number; title: string | null; body: string; tags: string | null; pinned: number; updated_at: string }

function Body({ note, tabId }: { note: Note; tabId?: string }) {
  const ws = useContext(WsContext)
  const [n, setN] = useState({ title: note.title ?? '', body: note.body, tags: note.tags ?? '', pinned: !!note.pinned })
  const [mode, setMode] = useState<'edit' | 'view'>('edit')
  const [st, track] = useSaving()
  useAutosaveEq(n, (v) => { track(update('notes', note.id, { title: v.title.trim() || null, body: v.body, tags: v.tags.trim() || null, pinned: v.pinned ? 1 : 0 })) })
  const words = n.body.trim() ? n.body.trim().split(/\s+/).length : 0
  return (
    <div className="ed"><div className="ed-in">
      <header className="ed-head">
        <input className="ed-title" aria-label="Título" placeholder="Sem título" value={n.title} onChange={(e) => setN({ ...n, title: e.target.value })} />
        <div className="ed-meta">
          <SaveBadge st={st} />
          {n.pinned && <span className="ed-pill ac">Fixada</span>}
          <Seg label="Modo" value={mode} options={[['edit', 'Editar'], ['view', 'Prévia']]} onChange={setMode} />
          <button className="btn" aria-pressed={n.pinned} onClick={() => setN({ ...n, pinned: !n.pinned })}>{n.pinned ? 'Desafixar' : 'Fixar'}</button>
          <span className="spacer" />
          <span className="muted" style={{ fontSize: 12 }}>{words} {words === 1 ? 'palavra' : 'palavras'}</span>
          <Del label="Excluir" onYes={async () => { await remove('notes', note.id).catch(() => {}); notifyItems(); if (tabId) ws?.closeTab(tabId) }} />
        </div>
      </header>
      {mode === 'edit'
        ? <textarea className="ed-plate" style={{ minHeight: '16em' }} aria-label="Texto da nota" placeholder="Escreva em Markdown: # título, **negrito**, listas…" value={n.body} onChange={(e) => setN({ ...n, body: e.target.value })} />
        : n.body.trim() ? <div className="ed-card flat" style={{ padding: '18px 22px' }}><Markdown text={n.body} /></div> : <div className="ed-empty">Nada para mostrar ainda.</div>}
      <label className="ed-field"><span>Tags</span><TagInput value={n.tags} onChange={(tags) => setN({ ...n, tags })} /></label>
    </div></div>
  )
}

export default function NoteEditor({ id, tabId }: { id: number; tabId?: string }) {
  const note = useDoc<Note>('notes', id)
  if (note === null) return <Msg>Nota não encontrada.</Msg>
  if (!note) return <Msg>Carregando…</Msg>
  return <Body key={id} note={note} tabId={tabId} />
}
