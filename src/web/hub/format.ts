import type { HubSummary } from '../../shared/types'

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export const shortDate = (iso: string | null | undefined) => {
  const d = iso ? new Date(iso) : null
  return d && !isNaN(+d) ? `${d.getDate()} ${MES[d.getMonth()]}` : '—'
}

export function daysAgo(iso: string | null | undefined) {
  const d = iso ? new Date(iso) : null
  if (!d || isNaN(+d)) return ''
  const n = Math.floor((Date.now() - +d) / 864e5)
  return n <= 0 ? 'hoje' : n === 1 ? 'ontem' : `há ${n} dias`
}

/** "Sáb 21 nov, 20h · Sessão 3 — A escada do farol" */
export function nextText(n: HubSummary['next_session']) {
  if (!n) return ''
  let when = ''
  const d = n.date ? new Date(n.date) : null
  if (n.date && d && !isNaN(+d)) {
    when = `${DIA[d.getDay()]} ${d.getDate()} ${MES[d.getMonth()]}`
    if (n.date.includes('T') && (d.getHours() || d.getMinutes())) when += `, ${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`
  } else if (n.date) when = n.date
  const ses = n.number ? `Sessão ${n.number}${n.title ? ' — ' + n.title : ''}` : n.title ?? 'Sessão planejada'
  return when ? `${when} · ${ses}` : ses
}
