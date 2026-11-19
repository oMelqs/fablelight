import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { create, get, list, postJson, remove } from '../api'
import { CreatureEditor, type Creature } from '../components/library/CreatureEditor'
import '../components/editor/ed.css'
import type { Campaign, System } from '../../shared/types'
import { Seg } from '../components/editor/ed'
import Icon from '../components/Icon'

export default function Bestiario({ initialId, campaignId: cid }: { initialId?: number; campaignId?: number } = {}) {
  const [params] = useSearchParams()
  const campaignId = cid ?? (params.get('campaign') ? Number(params.get('campaign')) : null)
  const [campaign, setCampaign] = useState<Campaign>()
  const [systems, setSystems] = useState<System[]>([])
  const [systemId, setSystemId] = useState<number>()
  const [rows, setRows] = useState<Creature[]>([])
  const [scope, setScope] = useState<'campaign' | 'library'>(campaignId ? 'campaign' : 'library')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<number | undefined>(initialId)
  const [err, setErr] = useState('')

  useEffect(() => { list<System>('systems').then(setSystems).catch((e) => setErr(e.message)) }, [])
  useEffect(() => {
    if (campaignId) get<Campaign>('campaigns', campaignId).then((c) => { setCampaign(c); setSystemId(c.system_id) }).catch((e) => setErr(e.message))
  }, [campaignId])
  useEffect(() => { if (!systemId && systems.length) setSystemId(systems[0].id) }, [systems, systemId])

  const inCampaign = scope === 'campaign' && !!campaignId
  const load = () => {
    if (!systemId) return
    list<Creature>('creatures', inCampaign ? { campaign_id: campaignId } : { campaign_id: 'null', system_id: systemId }).then(setRows).catch((e) => setErr(e.message))
  }
  useEffect(load, [systemId, inCampaign, campaignId])

  useEffect(() => { if (initialId && rows.length && !rows.some((r) => r.id === initialId) && scope === 'campaign') setScope('library') }, [rows]) // eslint-disable-line react-hooks/exhaustive-deps
  const system = systems.find((s) => s.id === systemId)
  const shown = rows.filter((r) => `${r.name} ${r.tier} ${r.tags}`.toLowerCase().includes(q.toLowerCase()))
  const current = rows.find((r) => r.id === sel)

  const add = async () => {
    const name = 'Nova criatura'
    if (!systemId) return
    try { const c = await create<Creature>('creatures', { name, system_id: systemId, campaign_id: inCampaign ? campaignId : null, stats: {} }); load(); setSel(c.id) } catch (e) { setErr((e as Error).message) }
  }
  const del = async () => {
    if (!current) return
    await remove('creatures', current.id).catch((e) => setErr(e.message)); setSel(undefined); load()
  }
  const copy = async () => {
    if (!current || !campaignId) return
    try { await postJson(`/api/campaigns/${campaignId}/duplicate-creature/${current.id}`); setErr('Copiada para a campanha.') } catch (e) { setErr((e as Error).message) }
  }

  const toList = (
    <div className="lib-list" role="listbox" aria-label="Criaturas">
      {shown.map((r) => (
        <button key={r.id} role="option" aria-selected={r.id === sel} className={`lib-item${r.id === sel ? ' on' : ''}`} onClick={() => setSel(r.id)}>
          <span className="nm">{r.name}</span>{r.tier && <span className="tr">{r.tier}</span>}
        </button>
      ))}
      {!shown.length && <div className="lib-empty" style={{ minHeight: 80 }}>Nenhuma criatura.</div>}
    </div>
  )
  return (
    <div className="lib">
      <div className="lib-bar">
        <h1>Bestiário</h1>
        {campaign && <Seg label="Escopo" value={scope} options={[['campaign', campaign.name], ['library', 'Biblioteca']]} onChange={setScope} />}
        {!campaignId && <select className="input" aria-label="Sistema" value={systemId ?? ''} onChange={(e) => setSystemId(Number(e.target.value))}>
          {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
        <span className="sp" />
        <input className="input" type="search" placeholder="Buscar criatura…" aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-primary" onClick={add}><Icon name="plus" size={13} />Criatura</button>
      </div>
      {err && <div className="ed-err" style={{ margin: 10 }}>{err}</div>}
      <div className="lib-body">
        {toList}
        <div className="lib-main">
          {!current || !system ? <div className="lib-empty">Escolha uma criatura na lista ou crie uma nova.</div>
            : <CreatureEditor key={current.id} creature={current} config={system.config} onDelete={del} scopeLabel={inCampaign ? 'Campanha' : 'Biblioteca'}
                onCopy={campaignId && !inCampaign ? copy : undefined} />}
        </div>
      </div>
    </div>
  )
}
