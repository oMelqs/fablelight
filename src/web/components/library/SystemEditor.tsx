import { useContext, useEffect, useMemo, useState } from 'react'
import { remove, update, create } from '../../api'
import type { System, SystemConfig } from '../../../shared/types'
import { WsContext } from '../../workspace/ctx'
import { notifyItems } from '../../workspace/data'
import Calculator from '../Calculator'
import Icon from '../Icon'
import { Del, Msg, SaveBadge, Sec, useDoc, useSaving } from '../editor/ed'

const MODES = ['pool', 'd20', 'sum', 'd100']
export const NEW_CONFIG: SystemConfig = {
  dice: [20], attributes: [], skills: [], fields: [], resources: [], tracks: [], conditions: [],
  roll: { mode: 'd20' }, difficulties: [{ label: 'Padrão', dt: 10 }],
}

function parse(text: string): { cfg?: SystemConfig; error?: string } {
  try {
    const cfg = JSON.parse(text)
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return { error: 'A configuração deve ser um objeto.' }
    if (!MODES.includes(cfg.roll?.mode)) return { error: `roll.mode deve ser um de: ${MODES.join(', ')}` }
    for (const k of ['dice', 'attributes', 'skills', 'fields', 'resources', 'tracks', 'conditions', 'difficulties'])
      if (cfg[k] !== undefined && !Array.isArray(cfg[k])) return { error: `"${k}" deve ser uma lista.` }
    return { cfg }
  } catch (e) { return { error: (e as Error).message } }
}

const MODE_LABEL: Record<string, string> = { pool: 'Pool de dados', d20: 'd20 + modificador', sum: 'Soma de dados', d100: 'Percentil' }

function Pills({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null
  return <div className="lib-pvr"><span className="ed-lab">{label}</span><div className="lib-pv">{items.map((t, i) => <span className="ed-pill" key={i}>{t}</span>)}</div></div>
}

export function SystemPreview({ cfg }: { cfg: SystemConfig }) {
  const attr = (k?: string) => cfg.attributes?.find((a) => a.key === k)?.label
  return (
    <div className="ed-card">
      <div className="lib-pvr"><span className="ed-lab">Rolagem</span>
        <div className="lib-pv"><span className="ed-pill ac">{MODE_LABEL[cfg.roll?.mode] ?? cfg.roll?.mode}</span>{cfg.dice?.map((d) => <span className="ed-pill mono" key={d}>d{d}</span>)}</div></div>
      <Pills label="Atributos" items={cfg.attributes?.map((a) => a.label)} />
      <Pills label="Perícias" items={cfg.skills?.map((s) => s.label + (attr(s.attribute) ? ` · ${attr(s.attribute)}` : ''))} />
      <Pills label="Campos" items={cfg.fields?.map((f) => f.label)} />
      <Pills label="Recursos" items={cfg.resources?.map((r) => r.label)} />
      <Pills label="Trilhas" items={cfg.tracks?.map((t) => `${t.label} ${t.min} a ${t.max}`)} />
      <Pills label="Condições" items={cfg.conditions} />
      <Pills label="Dificuldades" items={cfg.difficulties?.map((d) => `${d.label} ${d.dt}`)} />
    </div>
  )
}

/** JSON config editor with live preview and calculator. `system` null = new system. */
export function SystemEditor({ system, onSaved, onDeleted }: { system: System | null; onSaved: (s: System) => void; onDeleted?: () => void }) {
  const [name, setName] = useState(system?.name ?? 'Novo sistema')
  const [text, setText] = useState(JSON.stringify(system?.config ?? NEW_CONFIG, null, 2))
  const [st, track] = useSaving()
  const [saved, setSaved] = useState({ name: system?.name ?? '', text: system ? JSON.stringify(system.config, null, 2) : '' })
  const { cfg, error } = useMemo(() => parse(text), [text])
  const dirty = name !== saved.name || text !== saved.text
  const [delErr, setDelErr] = useState('')

  const save = () => {
    if (!cfg || !name.trim()) return
    track((system ? update<System>('systems', system.id, { name: name.trim(), config: cfg }) : create<System>('systems', { name: name.trim(), config: cfg }))
      .then((s) => { setSaved({ name, text }); onSaved(s) }))
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save() } }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  })

  return (
    <div className="ed"><div className="ed-in wide">
      <header className="ed-head">
        <input className="ed-title" aria-label="Nome do sistema" placeholder="Nome do sistema" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="ed-meta">
          <SaveBadge st={st} />
          <button className="btn btn-primary" disabled={!cfg || !name.trim() || !dirty} onClick={save}>{system ? 'Salvar' : 'Criar sistema'}</button>
          {dirty && <span className="muted" style={{ fontSize: 12 }}>Alterações não salvas · ⌘S</span>}
          <span className="spacer" />
          {system && onDeleted && <Del label="Apagar sistema" onYes={() => remove('systems', system.id).then(() => { notifyItems(); onDeleted() }, (e) => setDelErr(e.message))} />}
        </div>
        {delErr && <div className="ed-err">{delErr}</div>}
      </header>
      <div className="ed-cols eq">
        <Sec title="Configuração" hint="JSON">
          <textarea className="input lib-json" rows={26} spellCheck={false} aria-label="Configuração em JSON" value={text} onChange={(e) => setText(e.target.value)} />
          {error ? <div className="ed-err">{error}</div> : <span className="ed-saved saved"><Icon name="check" size={12} />JSON válido</span>}
        </Sec>
        <div className="ed-main">
          {cfg && <Sec title="Pré-visualização"><SystemPreview cfg={cfg} /></Sec>}
          {cfg && <Sec title="Testar calculadora"><div className="ed-card"><Calculator config={cfg} /></div></Sec>}
        </div>
      </div>
    </div></div>
  )
}

export default function SystemTab({ id, tabId }: { id: number; tabId?: string }) {
  const ws = useContext(WsContext)
  const s = useDoc<System>('systems', id)
  if (s === null) return <Msg>Sistema não encontrado.</Msg>
  if (!s) return <Msg>Carregando…</Msg>
  return <SystemEditor key={id} system={s} onSaved={notifyItems} onDeleted={() => tabId && ws?.closeTab(tabId)} />
}
