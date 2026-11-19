import { useEffect, useState } from 'react'
import { list } from '../api'
import type { System } from '../../shared/types'
import '../components/editor/ed.css'
import { SystemEditor } from '../components/library/SystemEditor'
import Icon from '../components/Icon'

export default function Sistemas({ initialId }: { initialId?: number } = {}) {
  const [systems, setSystems] = useState<System[]>([])
  const [sel, setSel] = useState<number | 'new' | null>(initialId ?? null)
  const load = () => list<System>('systems').then(setSystems)
  useEffect(() => { load() }, [])
  const cur = typeof sel === 'number' ? systems.find((s) => s.id === sel) : null

  return (
    <div className="lib">
      <div className="lib-bar">
        <h1>Sistemas</h1><span className="sp" />
        <button className="btn btn-primary" onClick={() => setSel('new')}><Icon name="plus" size={13} />Sistema</button>
      </div>
      <div className="lib-body">
        <div className="lib-list" role="listbox" aria-label="Sistemas">
          {systems.map((s) => (
            <button key={s.id} role="option" aria-selected={sel === s.id} className={`lib-item${sel === s.id ? ' on' : ''}`} onClick={() => setSel(s.id)}>
              <span className="nm">{s.name}</span><span className="tr">{s.config.roll?.mode}</span>
            </button>
          ))}
        </div>
        <div className="lib-main">
          {sel === null || (sel !== 'new' && !cur) ? <div className="lib-empty">Escolha um sistema para ver e editar as regras.</div>
            : <SystemEditor key={sel} system={sel === 'new' ? null : cur!}
                onSaved={(s) => { setSel(s.id); load() }} onDeleted={() => { setSel(null); load() }} />}
        </div>
      </div>
    </div>
  )
}
