import { useEffect, useMemo, useRef, useState } from 'react'
import { getJson } from '../api'
import Icon from '../components/Icon'
import { openables } from './commands'
import { useWs } from './ctx'
import { emit, listen, norm, type ConfirmReq } from './util'

/** In-app replacement for window.confirm / alert, driven by confirmDialog() and toast(). */
export function Dialogs() {
  const [req, setReq] = useState<ConfirmReq | null>(null)
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([])
  const ok = useRef<HTMLButtonElement>(null)
  useEffect(() => listen('rpgtable:confirm', (r: ConfirmReq) => setReq(r)), [])
  useEffect(() => listen('rpgtable:toast', (text: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }), [])
  useEffect(() => { if (req) ok.current?.focus() }, [req])
  const done = (v: boolean) => { req?.resolve(v); setReq(null) }
  return (
    <>
      {req && (
        <div className="ov open" onMouseDown={(e) => e.target === e.currentTarget && done(false)} onKeyDown={(e) => e.key === 'Escape' && done(false)}>
          <div className="box2 confirm" role="alertdialog" aria-modal="true" aria-label="Confirmação">
            <p>{req.message}</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => done(false)}>Cancelar</button>
              <button ref={ok} className={`btn ${req.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => done(true)}>{req.okLabel ?? 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}
      <div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}</div>
    </>
  )
}

const SHORTCUTS: [string, string][] = [
  ['⌘K', 'Paleta de comandos'], ['/', 'Foca o campo de comandos'], ['⌘B', 'Mostra ou esconde o explorador'], ['⌘\\', 'Divide o grupo (aba ativa à direita)'],
  ['⌘⇧M', 'Maximiza o grupo'], ['⌥W', 'Fecha a aba'], ['⌥[  ⌥]', 'Aba anterior / próxima'], ['⌥1–9', 'Troca de layout'],
  ['N', 'Próximo turno'], ['D', 'Dano no combatente ativo'], ['1–9', 'Efeitos sonoros (painel Áudio aberto)'], ['⌘Z', 'Desfaz a última entrada de combate'],
  ['⌘ clique', 'Abre o item do explorador num split à direita'], ['?', 'Esta folha'],
]
export function Shortcuts({ onClose }: { onClose: () => void }) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [onClose])
  return (
    <div className="ov open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="box2" role="dialog" aria-modal="true" aria-label="Atalhos">
        <div className="sheet"><h2>Atalhos</h2>
          {SHORTCUTS.map(([k, d]) => <div key={k}><span>{d}</span><span className="kbd">{k}</span></div>)}
        </div>
        <div className="pfoot">Atalhos de letra funcionam fora dos campos de texto.</div>
      </div>
    </div>
  )
}

interface PalItem { group: string; label: string; hint?: string; snippet?: string; run: () => void }

export function Palette({ onClose, actions }: { onClose: () => void; actions: { label: string; hint?: string; run: () => void }[] }) {
  const ws = useWs()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const [hits, setHits] = useState<any[]>([])
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { input.current?.focus() }, [])
  useEffect(() => {
    if (q.trim().length < 2 || q.startsWith('/')) { setHits([]); return }
    const t = setTimeout(() => getJson<any[]>(`/api/search?q=${encodeURIComponent(q)}&campaign_id=${ws.campaignId}&limit=12`).then(setHits, () => setHits([])), 200)
    return () => clearTimeout(t)
  }, [q, ws.campaignId])

  const list = useMemo<PalItem[]>(() => {
    const k = norm(q.trim())
    const done = (f: () => void) => () => { onClose(); f() }
    if (q.startsWith('/')) return [{ group: 'Registro', label: `Executar ${q.trim()}`, hint: 'Enter', run: done(() => { ws.open({ type: 'log' }); setTimeout(() => emit('rpgtable:focus-composer', { text: q }), 80) }) }]
    const f = (s: string) => !k || norm(s).includes(k)
    const out: PalItem[] = []
    actions.filter((a) => f(a.label)).forEach((a) => out.push({ group: 'Ações', label: a.label, hint: a.hint, run: done(a.run) }))
    ;[...ws.layoutNames.presets, ...ws.layoutNames.saved].filter((n) => f('layout ' + n)).forEach((n) => out.push({ group: 'Layouts', label: `Layout: ${n}`, run: done(() => ws.preset(n)) }))
    openables(ws.items).filter((o) => f(o.label)).slice(0, 30).forEach((o) => out.push({ group: 'Abrir', label: o.label, hint: o.hint, run: done(() => ws.open(o.spec)) }))
    hits.forEach((h) => {
      const spec = h.type === 'book' ? { type: 'book' as const, ref: `${h.book_id}:${h.chunk_id}`, title: (h.heading ?? h.book_title ?? '').split(' › ').slice(-1)[0] }
        : h.type === 'note' ? { type: 'note' as const, ref: h.id } : h.type === 'scene' ? { type: 'scene-edit' as const, ref: h.id }
        : h.type === 'character' ? { type: 'character' as const, ref: h.id } : h.type === 'creature' ? { type: 'creature' as const, ref: h.id } : null
      if (spec) out.push({ group: h.type === 'book' ? 'Livros' : 'Busca', label: h.title ?? h.heading ?? h.book_title ?? '', hint: h.book_title, snippet: h.snippet, run: done(() => ws.open(spec)) })
    })
    return out
  }, [q, hits, ws, actions, onClose])

  useEffect(() => { setSel(0) }, [q])
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, list.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); list[sel]?.run() }
  }
  useEffect(() => { document.querySelector('.pit.sel')?.scrollIntoView({ block: 'nearest' }) }, [sel])
  let last = ''
  return (
    <div className="ov open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="box2" role="dialog" aria-modal="true" aria-label="Paleta de comandos" onKeyDown={onKey}>
        <div className="pin2"><Icon name="search" size={16} />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar itens, painéis, layouts, trechos de livro… ( / para comando )" aria-label="Buscar" /></div>
        <div className="pres">
          {list.map((it, i) => {
            const head = it.group !== last ? <span className="lg" key={'g' + it.group + i}>{it.group}</span> : null
            last = it.group
            return (
              <div key={i}>
                {head}
                <button className={`pit${i === sel ? ' sel' : ''}`} onMouseMove={() => setSel(i)} onClick={it.run}>
                  <span className="h">{it.label}{it.hint && <small>{it.hint}</small>}</span>
                  {it.snippet && <span className="sn" dangerouslySetInnerHTML={{ __html: it.snippet }} />}
                </button>
              </div>
            )
          })}
          {!list.length && <div className="hint" style={{ padding: 14 }}>Nada encontrado.</div>}
        </div>
        <div className="pfoot"><span><span className="kbd">↑↓</span> navegar</span><span><span className="kbd">Enter</span> abrir</span><span><span className="kbd">Esc</span> fechar</span></div>
      </div>
    </div>
  )
}
