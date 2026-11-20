import { useId } from 'react'
import type { Campaign, CoverPattern, CoverTone } from '../../shared/types'

export const PATTERNS: CoverPattern[] = ['ondas', 'pontos', 'grade', 'raios']
export const TONES: Record<CoverTone, [string, string, string]> = {
  noite: ['#1d1b19', '#2a2723', '#47433c'],
  indigo: ['#1c1d2e', '#2a2d4d', '#8f9bff'],
  brasa: ['#231d17', '#3a2e22', '#a58a64'],
}
export const TONE_LABEL: Record<CoverTone, string> = { noite: 'Noite', indigo: 'Índigo', brasa: 'Brasa' }

/** Cover for a campaign row: config.cover, or a stable pattern/tone picked from the id. */
export function coverOf(c: Pick<Campaign, 'id' | 'config'>) {
  const v = c.config?.cover
  return { pattern: v?.pattern ?? PATTERNS[c.id % 4], tone: v?.tone ?? (['indigo', 'brasa', 'noite'] as CoverTone[])[c.id % 3], image: v?.image }
}

type Props = { pattern: CoverPattern; tone: CoverTone; name: string; image?: string; initial?: boolean }

/** Generated cover (SVG) or an uploaded image, filling its parent. */
export default function CampaignCover({ pattern, tone, name, image, initial = true }: Props) {
  const id = useId()
  if (image) return <img className="cv-img" src={image} alt="" />
  const [a, b, c] = TONES[tone]
  const mark: React.ReactNode[] = []
  if (pattern === 'ondas') for (let i = 0; i < 8; i++) mark.push(<path key={i} d={`M-10 ${70 + i * 16}q30-14 60 0t60 0t60 0t60 0t60 0`} fill="none" stroke={c} strokeOpacity={0.12 + i * 0.03} strokeWidth="1.5" />)
  if (pattern === 'pontos') for (let y = 0; y < 9; y++) for (let x = 0; x < 16; x++) mark.push(<circle key={`${x}-${y}`} cx={x * 18 + (y % 2) * 9} cy={y * 16 + 6} r={1 + ((x * 7 + y * 3) % 4) * 0.45} fill={c} fillOpacity=".28" />)
  if (pattern === 'grade') for (let i = 0; i < 14; i++) mark.push(<path key={i} d={`M${i * 22} 0V150M0 ${i * 14}H300`} stroke={c} strokeOpacity=".13" />)
  if (pattern === 'raios') for (let i = 0; i < 14; i++) mark.push(<path key={i} d={`M60 150L${-60 + i * 34} 0`} stroke={c} strokeOpacity=".16" strokeWidth="1.5" />)
  const ini = name.trim().charAt(0).toUpperCase()
  return (
    <svg className="cv-svg" viewBox="0 0 300 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor={b} /><stop offset="1" stopColor={a} /></linearGradient></defs>
      <rect width="300" height="150" fill={`url(#${id})`} />
      {mark}
      {initial && ini && <text x="150" y="106" textAnchor="middle" fontFamily="Geist, sans-serif" fontWeight="600" fontSize="76" letterSpacing="-4" fill={c} fillOpacity=".5">{ini}</text>}
    </svg>
  )
}
