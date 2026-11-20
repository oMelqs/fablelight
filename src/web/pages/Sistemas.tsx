import { useEffect, useState } from 'react'
import { list } from '../api'
import type { System } from '../../shared/types'
import '../components/editor/ed.css'
import '../library/library.css'
import SystemBuilder from '../components/library/SystemBuilder'
import { LIcon } from '../library/ui'

const MODE: Record<string, string> = { pool: 'pool', d20: 'd20', sum: 'soma', d100: 'd100' }

export default function Sistemas({ initialId }: { initialId?: number } = {}) {
  const [systems, setSystems] = useState<System[]>([])
  const [sel, setSel] = useState<number | 'new' | undefined>(initialId)
  const [err, setErr] = useState('')
  const load = () => list<System>('systems').then(setSystems).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [])
  useEffect(() => { if (sel === undefined && systems.length) setSel(systems[0].id) }, [systems, sel])
  const cur = typeof sel === 'number' ? systems.find((s) => s.id === sel) : null

  return (
    <div className="lb">
      <div className="lb-tb">
        <h2>Sistemas</h2>
        <div className="ed-seg" role="group" aria-label="Sistemas">
          {systems.map((s) => (
            <button key={s.id} type="button" className={sel === s.id ? 'on' : ''} aria-pressed={sel === s.id} onClick={() => setSel(s.id)}>
              {s.name} <span className="mono lb-faint">{MODE[s.config.roll?.mode] ?? ''}</span></button>
          ))}
        </div>
        <button className="btn btn-ghost" aria-pressed={sel === 'new'} onClick={() => setSel('new')}><LIcon name="plus" size={14} />Novo</button>
      </div>
      {err && <div className="error lb-err" role="alert">{err}</div>}
      {sel === 'new' || cur
        ? <SystemBuilder key={sel} system={sel === 'new' ? null : cur!} onSaved={(s) => { setSel(s.id); load() }} onDeleted={() => { setSel(undefined); load() }} />
        : <div className="lb-empty">Escolha um sistema para ver e editar as regras.</div>}
    </div>
  )
}
