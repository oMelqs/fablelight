import type { ReactNode } from 'react'
import type { Campaign, HubSummary, System } from '../../shared/types'
import Icon from '../components/Icon'
import CampaignCover, { coverOf } from './CampaignCover'
import { nextText, shortDate } from './format'

type Props = {
  c: Pick<Campaign, 'id' | 'name' | 'description' | 'config'>
  system?: System
  sum?: HubSummary
  title?: ReactNode // replaces the name (inline rename)
  actions?: ReactNode
  preview?: boolean
}

export default function CampaignCard({ c, system, sum, title, actions, preview }: Props) {
  const cv = coverOf(c)
  const next = nextText(sum?.next_session ?? null)
  return (
    <>
      <div className="cc-cover">
        <CampaignCover {...cv} name={c.name} />
        {actions && <div className="cc-acts">{actions}</div>}
      </div>
      <div className="cc-body">
        <div>
          {title ?? <h3>{c.name || 'Sem nome'}</h3>}
          <div className="mono dim cc-sys">{system?.name ?? '—'}</div>
        </div>
        <p className="dim cc-desc">{c.description || (preview ? 'Sem descrição.' : '')}</p>
        <div className="cc-stats">
          <div><b>{sum?.sessions ?? 0}</b><span>sessões</span></div>
          <div><b>{sum?.pcs ?? 0}</b><span>PJs</span></div>
          <div><b>{shortDate(sum?.last_played)}</b><span>última mesa</span></div>
        </div>
        <div className={'cc-next' + (next ? '' : ' faint')}><Icon name="note" size={14} />{next || 'Sem próxima sessão marcada'}</div>
      </div>
    </>
  )
}
