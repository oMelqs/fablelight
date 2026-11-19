import { useEffect, useState } from 'react'
import { get } from '../../api'
import Calculator from '../Calculator'
import type { Campaign, System } from '../../../shared/types'

export default function CalculatorTab({ campaignId }: { campaignId: number }) {
  const [system, setSystem] = useState<System>()
  useEffect(() => {
    get<Campaign>('campaigns', campaignId).then((c) => get<System>('systems', c.system_id)).then(setSystem).catch(() => {})
  }, [campaignId])
  return system ? <Calculator config={system.config} campaignId={campaignId} /> : <div className="muted">Carregando…</div>
}
