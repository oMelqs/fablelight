import { useEffect, useState } from 'react'
import { evaluate, rollVirtual } from '../../shared/dice'
import type { Die, RollRow, SystemConfig } from '../../shared/types'
import { create, list } from '../api'
import Icon from './Icon'
import './calc.css'
import { logEvent, rollData } from '../workspace/log'

const rid = () => Math.random().toString(36).slice(2)
type Row = { id: string; sides: number; value: number | '' }

export default function Calculator({ config, campaignId }: { config: SystemConfig; campaignId?: number | null }) {
  const rule = config.roll
  const scale = config.dice?.length ? config.dice : [20]
  const [rows, setRows] = useState<Row[]>([])
  const [dt, setDt] = useState<number | ''>('')
  const [mod, setMod] = useState(0)
  const [adv, setAdv] = useState<'' | 'adv' | 'dis'>('')
  const [who, setWho] = useState('')
  const [label, setLabel] = useState('')
  const [history, setHistory] = useState<RollRow[]>([])
  const [err, setErr] = useState('')

  const loadHistory = () => { if (campaignId) list<RollRow>('rolls', { campaign_id: campaignId }).then((r) => setHistory(r.slice(-10).reverse())).catch(() => {}) }
  useEffect(loadHistory, [campaignId])
  useEffect(() => setRows([]), [rule.mode])

  const byRow = new Map<string, Die>()
  for (const r of rows) if (r.value !== '') byRow.set(r.id, { sides: r.sides, value: Number(r.value) })
  const dice = [...byRow.values()]
  const input = { dt: dt === '' ? undefined : dt, modifier: mod, advantage: adv || undefined }
  const res = dice.length ? evaluate(rule, dice, input) : null

  const add = (sides: number) => setRows((r) => [...r, { id: rid(), sides, value: '' }])
  const setVal = (id: string, value: number | '') => setRows((r) => r.map((x) => (x.id === id ? { ...x, value } : x)))
  const virtual = () => {
    const base = rows.length ? rows : [{ id: rid(), sides: rule.mode === 'd100' ? 100 : rule.mode === 'd20' ? 20 : scale[scale.length > 1 ? 1 : 0] }]
    const rolled = rollVirtual(rule, base)
    setRows(base.map((r, i) => ({ id: r.id, sides: r.sides, value: rolled[i].value })))
  }
  const register = async () => {
    if (!res) return
    try {
      await create('rolls', { campaign_id: campaignId, who: who || null, label: label || null, input: { dice, ...input }, result: res })
      setErr(''); loadHistory()
      if (campaignId) logEvent('roll', `Rolagem ${res.total}`, { ...rollData(res, dice, { dt: input.dt, modifier: mod, label: label || undefined, who: who || undefined, mode: rule.mode }), via: 'Calculadora' })
    } catch (e) { setErr((e as Error).message) }
  }

  const tone = !res ? '' : res.critical ? 'crit' : res.fumble ? 'bad' : res.success === undefined ? '' : res.success ? 'ok' : 'bad'
  const verdict = !res ? '' : res.critical ? 'Crítico' : res.fumble ? 'Falha crítica' : res.success === undefined ? '' : res.success ? 'Sucesso' : 'Falha'
  const dtLabel = rule.mode === 'd100' ? 'Alvo' : 'DT'

  return (
    <div className="calc">
      <div className="cc-chips">
        {scale.map((s) => <button key={s} className="cc-chip" onClick={() => add(s)} title={`Adicionar d${s}`}>+d{s}</button>)}
        {rule.mode === 'd20' && (
          <div className="seg" role="group" aria-label="Vantagem">
            {([['', 'Normal'], ['adv', 'Vant.'], ['dis', 'Desv.']] as const).map(([v, l]) => <button key={v} className={adv === v ? 'on' : ''} aria-pressed={adv === v} onClick={() => setAdv(v)}>{l}</button>)}
          </div>
        )}
        <span className="spacer" />
        <button className="btn sm" onClick={virtual} title="Sorteia os valores dos dados">Rolar virtual</button>
        <button className="btn sm ghost" disabled={!rows.length} onClick={() => setRows([])}>Limpar</button>
      </div>

      <div className="cc-dice">
        {rows.map((r) => {
          const die = byRow.get(r.id)
          const dropped = !!(die && res && !res.kept.includes(die))
          return (
            <label key={r.id} className={'cc-die' + (dropped ? ' x' : '')}>
              <b>d{r.sides}</b>
              <input type="number" min={1} max={r.sides} value={r.value} placeholder="–" aria-label={`Valor do d${r.sides}`}
                onChange={(e) => setVal(r.id, e.target.value === '' ? '' : Number(e.target.value))} />
              <button className="btn-x" title="Remover" aria-label="Remover dado" onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))}><Icon name="x" size={12} /></button>
            </label>
          )
        })}
        {!rows.length && <span className="cc-hint">Adicione dados e digite o valor tirado, ou use Rolar virtual.</span>}
      </div>

      <div className="cc-dt">
        <span className="cc-k">{dtLabel}</span>
        {config.difficulties?.map((d) => (
          <button key={d.label} className={'cc-chip' + (dt === d.dt ? ' on' : '')} aria-pressed={dt === d.dt} onClick={() => setDt(dt === d.dt ? '' : d.dt)}>{d.label} <b>{d.dt}</b></button>
        ))}
        <input className="inp cc-n" type="number" placeholder={dtLabel} aria-label={dtLabel} value={dt} onChange={(e) => setDt(e.target.value === '' ? '' : Number(e.target.value))} />
        {rule.mode !== 'd100' && <label className="cc-mod"><span className="cc-k">Mod</span>
          <input className="inp cc-n" type="number" value={mod} onChange={(e) => setMod(Number(e.target.value))} /></label>}
      </div>

      {res ? (
        <div className={`cc-res ${tone}`}>
          <div className="cc-top">
            <div className="cc-big">{res.total}</div>
            <div className="cc-meta">
              <span>soma <b>{res.sum}</b>{mod ? <> {mod > 0 ? '+' : '−'} <b>{Math.abs(mod)}</b></> : null}</span>
              {rule.mode === 'pool' && <span>RA <b>{res.high}</b> · RB <b>{res.low}</b></span>}
              {res.success !== undefined && <span>margem <b>{res.margin! >= 0 ? '+' : ''}{res.margin}</b></span>}
            </div>
            {verdict && <span className="cc-verd">{verdict}</span>}
          </div>
          <div className="cc-tiles" title="Dourado: mantidos. Riscado: descartados.">
            {res.kept.map((d, i) => <span className="cc-tile k" key={'k' + i}>{d.value}</span>)}
            {res.discarded.map((d, i) => <span className="cc-tile x" key={'x' + i}>{d.value}</span>)}
          </div>
        </div>
      ) : <div className="cc-res idle">Resultado aparece aqui.</div>}

      {campaignId ? (
        <div className="cc-reg">
          <input className="inp" placeholder="Quem" value={who} onChange={(e) => setWho(e.target.value)} />
          <input className="inp" placeholder="Rótulo" value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && res && register()} />
          <button className="btn pri" disabled={!res} onClick={register}>Registrar no log</button>
        </div>
      ) : null}
      {err && <div className="error">{err}</div>}

      {campaignId ? (
        <div className="cc-hist">
          <h4>Últimas rolagens</h4>
          {history.map((h) => (
            <div key={h.id} className="cc-h">
              <b className="mono">{h.result.total}</b>
              <span className="cc-hl">{[h.who, h.label].filter(Boolean).join(' · ') || '—'}</span>
              {h.result.critical && <span className="cc-tag crit">crít.</span>}
              {h.result.fumble && <span className="cc-tag bad">falha crít.</span>}
              {h.result.success !== undefined && !h.result.critical && !h.result.fumble && <span className={'cc-tag ' + (h.result.success ? 'ok' : 'bad')}>{h.result.success ? 'sucesso' : 'falha'}</span>}
              <time className="mono">{new Date(h.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
            </div>
          ))}
          {!history.length && <span className="cc-hint">Nenhuma rolagem ainda.</span>}
        </div>
      ) : null}
    </div>
  )
}
