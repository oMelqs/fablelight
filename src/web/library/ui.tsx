import { useEffect, useState, type ReactNode } from 'react'
import { list } from '../api'
import Icon from '../components/Icon'

// Icons the base set lacks (paths from prototypes/telas-b.html). Falls back to Icon.
const EXTRA: Record<string, string> = {
  yt: 'M2.5 5.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2ZM6.8 6v4l3.2-2Z',
  folder: 'M2.5 4.5h4l1.5 1.5h5.5v6.5h-11Z',
  loop: 'M3 7V6a2 2 0 0 1 2-2h7l-2-2M13 9v1a2 2 0 0 1-2 2H4l2 2',
  upload: 'M8 10.5V3M5 6l3-3 3 3M3 11.5v1h10v-1',
  copy: 'M6 6h7v7H6ZM3 10V3h7',
  refresh: 'M13 3v3.5h-3.5M13 6.5A5 5 0 1 0 12.5 10',
  grip: 'M6 4h.01M6 8h.01M6 12h.01M10 4h.01M10 8h.01M10 12h.01',
  code: 'M5.5 5L2.5 8l3 3M10.5 5l3 3-3 3M8.8 4l-1.6 8',
  pause: 'M5.5 3.5v9M10.5 3.5v9',
  sort: 'M5 3v10M3 11l2 2 2-2M11 13V3M9 5l2-2 2 2',
}
export function LIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  if (!EXTRA[name]) return <Icon name={name} size={size} />
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`icon ${className ?? ''}`}>
      <path d={EXTRA[name]} />
    </svg>
  )
}

export type Camp = { id: number; name: string; system_id: number }
export function useCampaigns() {
  const [camps, setCamps] = useState<Camp[]>([])
  useEffect(() => { list<Camp>('campaigns').then(setCamps).catch(() => {}) }, [])
  return camps
}
export const scopeName = (camps: Camp[], id: number | null) => (id == null ? 'Biblioteca' : camps.find((c) => c.id === id)?.name ?? `Campanha ${id}`)

// ---- generated covers (brand tones, same family as the campaign covers) ----
export const TONES = { noite: ['#1d1b19', '#2a2723', '#47433c'], indigo: ['#1c1d2e', '#2a2d4d', '#8f9bff'], brasa: ['#231d17', '#3a2e22', '#a58a64'] } as const
export type Tone = keyof typeof TONES
export const PATTERNS = ['ondas', 'pontos', 'grade', 'raios'] as const
export type Pattern = (typeof PATTERNS)[number]
const TONE_KEYS = Object.keys(TONES) as Tone[]
/** Deterministic pattern+tone from an id, for items that carry no cover of their own. */
export const coverFor = (id: number) => ({ pattern: PATTERNS[id % 4] as Pattern, tone: TONE_KEYS[(id * 7 + 1) % 3] })

export function Cover({ pattern, tone, text, viewBox = '0 0 300 150' }: { pattern: Pattern; tone: Tone; text?: string; viewBox?: string }) {
  const [a, b, c] = TONES[tone]
  const gid = `cv-${pattern}-${tone}`
  const els: ReactNode[] = []
  if (pattern === 'ondas') for (let i = 0; i < 8; i++) els.push(<path key={i} d={`M-10 ${70 + i * 16}q30-14 60 0t60 0t60 0t60 0t60 0`} fill="none" stroke={c} strokeOpacity={0.12 + i * 0.03} strokeWidth={1.5} />)
  if (pattern === 'pontos') for (let y = 0; y < 9; y++) for (let x = 0; x < 16; x++) els.push(<circle key={`${x}-${y}`} cx={x * 18 + (y % 2) * 9} cy={y * 16 + 6} r={1 + ((x * 7 + y * 3) % 4) * 0.45} fill={c} fillOpacity={0.28} />)
  if (pattern === 'grade') for (let i = 0; i < 14; i++) els.push(<path key={i} d={`M${i * 22} 0V150M0 ${i * 14}H300`} stroke={c} strokeOpacity={0.13} />)
  if (pattern === 'raios') for (let i = 0; i < 14; i++) els.push(<path key={i} d={`M60 150L${-60 + i * 34} 0`} stroke={c} strokeOpacity={0.16} strokeWidth={1.5} />)
  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop stopColor={b} /><stop offset="1" stopColor={a} /></linearGradient></defs>
      <rect width="300" height="150" fill={`url(#${gid})`} />
      {els}
      {text && <text x="150" y="106" textAnchor="middle" fontFamily="Geist, sans-serif" fontWeight={600} fontSize={76} letterSpacing={-4} fill={c} fillOpacity={0.5}>{text}</text>}
    </svg>
  )
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="lb-empty">
      <div className="lb-empty-ic"><LIcon name={icon} size={22} /></div>
      <h3>{title}</h3>
      {children}
    </div>
  )
}

export const Chip = ({ on, onClick, children, dashed }: { on?: boolean; onClick?: () => void; children: ReactNode; dashed?: boolean }) =>
  onClick ? <button type="button" className={`lb-chip${on ? ' on' : ''}${dashed ? ' dashed' : ''}`} aria-pressed={on} onClick={onClick}>{children}</button>
    : <span className={`lb-chip${on ? ' on' : ''}`}>{children}</span>

/** True when the keyboard event comes from a text field. */
export const typing = (e: KeyboardEvent | React.KeyboardEvent) => {
  const t = e.target as HTMLElement | null
  return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
}
