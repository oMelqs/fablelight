import { useState } from 'react'
import { create, update } from '../../api'
import { useWs } from '../../workspace/ctx'
import { notifyItems } from '../../workspace/data'
import Icon from '../Icon'
import { Msg, SaveBadge, Sec, Seg, useDoc, useSaving , useAutosaveEq } from '../editor/ed'

interface Sess { id: number; campaign_id: number; number: number | null; title: string | null; date: string | null; status: 'planned' | 'played'; summary: string | null }

function Body({ row }: { row: Sess }) {
  const ws = useWs()
  const [s, setS] = useState({ number: row.number ?? ('' as number | ''), title: row.title ?? '', date: row.date ?? '', status: row.status, summary: row.summary ?? '' })
  const [st, track] = useSaving()
  useAutosaveEq(s, (v) => { track(update('sessions', row.id, { number: v.number === '' ? null : v.number, title: v.title, date: v.date || null, status: v.status, summary: v.summary })) })
  const scenes = ws.items.scenes.filter((x) => x.session_id === row.id).sort((a, b) => a.ord - b.ord || a.id - b.id)
  const encName = (id: number | null) => ws.items.encounters.find((e) => e.id === id)?.name
  const addScene = async () => {
    const sc = await create<{ id: number; title: string }>('scenes', { campaign_id: row.campaign_id, session_id: row.id, title: 'Nova cena', ord: scenes.length })
    notifyItems(); ws.open({ type: 'scene-edit', ref: sc.id, title: sc.title })
  }
  return (
    <div className="ed"><div className="ed-in">
      <header className="ed-head">
        <div className="row nowrap" style={{ gap: 12, alignItems: 'baseline' }}>
          <input className="ed-title" style={{ width: '3.2ch', flex: 'none', fontFamily: 'var(--mono)', textAlign: 'center', color: 'var(--acl)' }} type="number" aria-label="Número da sessão" placeholder="#" value={s.number} onChange={(e) => setS({ ...s, number: e.target.value === '' ? '' : Number(e.target.value) })} />
          <input className="ed-title" aria-label="Título da sessão" placeholder="Título da sessão" value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} />
        </div>
        <div className="ed-meta">
          <SaveBadge st={st} />
          <Seg label="Estado" value={s.status} options={[['planned', 'Planejada'], ['played', 'Jogada']]} onChange={(status) => setS({ ...s, status })} />
          <input className="input" type="date" aria-label="Data" value={s.date} onChange={(e) => setS({ ...s, date: e.target.value })} />
        </div>
      </header>
      <Sec title="Resumo" hint="o que aconteceu ou está planejado">
        <textarea className="ed-plate" aria-label="Resumo" placeholder="Em uma sessão jogada, registre o que ficou decidido. Em uma planejada, o roteiro em linhas gerais." value={s.summary} onChange={(e) => setS({ ...s, summary: e.target.value })} />
      </Sec>
      <Sec title="Cenas" count={scenes.length} aside={<button className="btn" onClick={addScene}><Icon name="plus" size={13} />Cena</button>}>
        {!scenes.length && <div className="ed-empty">Nenhuma cena nesta sessão ainda.</div>}
        {!!scenes.length && <div className="ed-card flat" style={{ padding: '4px 12px' }}>
          {scenes.map((x, i) => (
            <div className="lib-row" key={x.id}>
              <span className="ed-idx">{i + 1}</span>
              <button className="nm btn-ghost" style={{ textAlign: 'left', border: 0, background: 'none', padding: 0, color: 'var(--text)' }} onClick={() => ws.open({ type: 'scene-edit', ref: x.id, title: x.title })}>{x.title || 'Sem título'}</button>
              {encName(x.encounter_id) && <span className="ed-pill dim"><Icon name="sword" size={11} />{encName(x.encounter_id)}</span>}
              <button className="btn btn-ghost" onClick={() => ws.open({ type: 'scene-edit', ref: x.id, title: x.title })}>Abrir</button>
            </div>
          ))}
        </div>}
      </Sec>
    </div></div>
  )
}

export default function SessionEditor({ id }: { id: number }) {
  const row = useDoc<Sess>('sessions', id)
  if (row === null) return <Msg>Sessão não encontrada.</Msg>
  if (!row) return <Msg>Carregando…</Msg>
  return <Body key={id} row={row} />
}
