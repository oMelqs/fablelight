import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { create, list, remove } from '../api'
import type { Campaign, System } from '../../shared/types'
import { Del } from '../components/editor/ed'
import '../components/editor/ed.css'

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [systems, setSystems] = useState<System[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemId, setSystemId] = useState<number>(0)
  const [err, setErr] = useState('')

  const load = () => {
    list<Campaign>('campaigns').then(setCampaigns).catch((e) => setErr(e.message))
    list<System>('systems').then((s) => { setSystems(s); setSystemId((cur) => cur || s[0]?.id || 0) }).catch(() => {})
  }
  useEffect(load, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !systemId) return
    try { await create('campaigns', { name: name.trim(), description, system_id: systemId }); setName(''); setDescription(''); load() }
    catch (e) { setErr((e as Error).message) }
  }
  const del = async (c: Campaign) => { await remove('campaigns', c.id).catch((e) => setErr(e.message)); load() }
  const sysName = (id: number) => systems.find((s) => s.id === id)?.name ?? '—'

  return (
    <div className="ed" style={{ flex: 1 }}><div className="ed-in wide">
      <header className="ed-head">
        <h1 style={{ fontSize: 28, letterSpacing: '-.02em' }}>Campanhas</h1>
      </header>
      {err && <div className="ed-err">{err}</div>}
      <div className="lib-grid">
        {campaigns.map((c) => (
          <div key={c.id} className="ed-card lib-camp">
            <div className="row nowrap" style={{ alignItems: 'flex-start' }}>
              <span className="lib-mark" aria-hidden="true">{c.name.trim().charAt(0).toUpperCase() || '?'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link to={`/c/${c.id}`}><h3>{c.name}</h3></Link>
                <span className="ed-pill dim" style={{ marginTop: 6 }}>{sysName(c.system_id)}</span>
              </div>
            </div>
            {c.description && <p>{c.description}</p>}
            <div className="row">
              <Link className="btn btn-primary" to={`/c/${c.id}`}>Abrir</Link><span className="spacer" />
              <Del label="Apagar" ask="Apagar tudo da campanha" onYes={() => del(c)} />
            </div>
          </div>
        ))}
        {!campaigns.length && <div className="ed-empty">Nenhuma campanha ainda. Crie a primeira abaixo.</div>}
      </div>

      <form className="ed-card" style={{ maxWidth: 520 }} onSubmit={add}>
        <div className="ed-h">Nova campanha</div>
        <input className="input" aria-label="Nome" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" aria-label="Descrição" placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <select className="input" aria-label="Sistema" value={systemId} onChange={(e) => setSystemId(Number(e.target.value))}>
          {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div><button className="btn btn-primary" disabled={!name.trim() || !systemId}>Criar campanha</button></div>
      </form>
    </div></div>
  )
}
