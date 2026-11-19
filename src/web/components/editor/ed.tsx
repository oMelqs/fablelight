import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { get } from '../../api'
import { notifyItems } from '../../workspace/data'
import Icon from '../Icon'
import { useAutosave } from '../combat/useAutosave'
import './ed.css'

export type Save = { s: 'idle' | 'saving' | 'saved' | 'err'; m?: string }

/** Tracks a save promise: `track(update(...))` drives the quiet "Salvo" indicator and refreshes the explorer. */
export function useSaving() {
  const [st, setSt] = useState<Save>({ s: 'idle' })
  const track = useCallback((p: Promise<unknown>) => {
    setSt({ s: 'saving' })
    return p.then(() => { setSt({ s: 'saved' }); notifyItems() }, (e) => setSt({ s: 'err', m: e.message }))
  }, [])
  return [st, track] as const
}

export function SaveBadge({ st }: { st: Save }) {
  if (st.s === 'idle') return <span className="ed-saved" />
  if (st.s === 'err') return <span className="ed-saved err" role="alert">Erro ao salvar: {st.m}</span>
  return <span className="ed-saved saved" aria-live="polite">{st.s === 'saving' ? 'Salvando…' : <><Icon name="check" size={12} />Salvo</>}</span>
}

/** Loads one row. undefined = loading, null = not found. */
export function useDoc<T>(table: string, id: number): T | null | undefined {
  const [d, setD] = useState<T | null | undefined>()
  useEffect(() => { setD(undefined); get<T>(table, id).then(setD, () => setD(null)) }, [table, id])
  return d
}

export const Msg = ({ children }: { children: ReactNode }) => <div className="ed"><div className="ed-in"><div className="ed-empty">{children}</div></div></div>

export function Sec({ title, count, aside, hint, children }: { title: string; count?: number; aside?: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <section className="ed-sec">
      <div className="ed-h">{title}{count !== undefined && <span className="n">{count}</span>}{hint && <span className="hint">{hint}</span>}<span className="sp" />{aside}</div>
      {children}
    </section>
  )
}

/** Two-step delete: first click asks, second confirms. No window.confirm. */
export function Del({ onYes, label = 'Excluir', ask = 'Confirmar', icon = true }: { onYes: () => void; label?: string; ask?: string; icon?: boolean }) {
  const [on, setOn] = useState(false)
  useEffect(() => { if (!on) return; const t = setTimeout(() => setOn(false), 4000); return () => clearTimeout(t) }, [on])
  if (on) return (
    <span className="ed-confirm">
      <button className="btn btn-danger" onClick={() => { setOn(false); onYes() }}>{ask}</button>
      <button className="btn btn-ghost" onClick={() => setOn(false)}>Cancelar</button>
    </span>
  )
  return <button className="btn btn-ghost danger" aria-label={label || "Excluir"} onClick={() => setOn(true)}>{icon && <Icon name="trash" size={13} />}{label}</button>
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="ed-seg" role="group" aria-label={label}>
      {options.map(([v, t]) => <button key={v} type="button" className={v === value ? 'on' : ''} aria-pressed={v === value} onClick={() => onChange(v)}>{t}</button>)}
    </div>
  )
}

/** Tags as chips, stored as "a, b, c". */
export function TagInput({ value, onChange, placeholder = 'Adicionar tag' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const tags = value.split(',').map((t) => t.trim()).filter(Boolean)
  const [txt, setTxt] = useState('')
  const add = (raw: string) => {
    const t = raw.replace(/,/g, '').trim()
    if (t && !tags.includes(t)) onChange([...tags, t].join(', '))
    setTxt('')
  }
  return (
    <div className="ed-tags">
      {tags.map((t) => <span className="ed-tag" key={t}>{t}<button type="button" aria-label={`Remover ${t}`} onClick={() => onChange(tags.filter((x) => x !== t).join(', '))}><Icon name="x" size={10} /></button></span>)}
      <input className="ed-taginput" value={txt} placeholder={tags.length ? '' : placeholder} aria-label="Tags"
        onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setTxt(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(txt) }
          else if (e.key === 'Backspace' && !txt && tags.length) onChange(tags.slice(0, -1).join(', '))
        }}
        onBlur={() => add(txt)} />
    </div>
  )
}

/** Attribute/skill value: die chips for pool systems (click again to clear), a number otherwise. */
export function Val({ value, dice, pool, onChange, label }: { value?: number; dice: number[]; pool: boolean; onChange: (v: number) => void; label: string }) {
  if (!pool) return <input className="input num ed-score" type="number" aria-label={label} placeholder="—" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
  const all = value && !dice.includes(value) ? [...dice, value].sort((a, b) => a - b) : dice
  return (
    <span className="ed-dice" role="group" aria-label={label}>
      {all.map((d) => <button key={d} type="button" className={`ed-die${value === d ? ' on' : ''}`} aria-pressed={value === d} title={`d${d}`} onClick={() => onChange(value === d ? 0 : d)}>d{d}</button>)}
    </span>
  )
}

/** useAutosave, but re-renders carrying equal data never trigger a save. */
export function useAutosaveEq<T>(value: T, save: (v: T) => void) {
  const key = JSON.stringify(value)
  const stable = useMemo(() => value, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useAutosave(stable, save)
}
