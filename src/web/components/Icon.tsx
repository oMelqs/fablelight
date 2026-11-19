// Direction A (Fablelight) icon family: 16px grid, 1.5 stroke, round caps, radius-2 outlines, light dots ("h.01").
// Names are the app's existing ones; see prototypes/marca.html for the A originals.
const BOX = 'M4.5 2.5h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z'
const HEART = 'M8 13.5S2.5 10 2.5 6a3 3 0 0 1 5.5-1.6A3 3 0 0 1 13.5 6c0 4-5.5 7.5-5.5 7.5Z'
const P: Record<string, string> = {
  // from A
  log: 'M3 4h10M3 8h6M3 12h10M12.5 8h.01',
  scene: 'M4.5 3h7a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM2.5 11l3.5-3 3 2.5 1.5-1.2 3 2.2M10.5 6h.01',
  sword: 'M8 2l1.8 4.2L14 8l-4.2 1.8L8 14l-1.8-4.2L2 8l4.2-1.8Z',
  dice: 'M4.5 2.5h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM5.75 5.75h.01M10.25 10.25h.01M8 8h.01',
  books: 'M4 2.5h8.5v11H4a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 4 2.5ZM5.5 5.5h5',
  audio: 'M2.5 6h2.5l3.5-3v10L5 10H2.5ZM11.5 5.5a3.5 3.5 0 0 1 0 5',
  campaigns: 'M8 2a4 4 0 0 0 6 6 6 6 0 1 1-6-6Z',
  bestiary: 'M1.5 8S4 4 8 4s6.5 4 6.5 4-2.5 4-6.5 4S1.5 8 1.5 8ZM8 6v4',
  note: 'M4 2.5h5.5l2.5 2.5v8.5H4ZM9.5 2.5V5H12M6 8h4M6 10.5h3',
  systems: 'M2.5 5h6.5M12 5h1.5M10.5 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM2.5 11h2M7.5 11h6M6 12.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  users: 'M8 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 13.5c0-2.5 2.2-4 5-4s5 1.5 5 4M13 3h.01',
  layout: 'M4.5 2.5h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM2.5 6.5h11M7 6.5v7',
  split: BOX + 'M8 2.5v11',
  max: 'M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3',
  search: 'M7 11.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM13.5 13.5l-3.3-3.3',
  // redrawn in A's style
  splitv: BOX + 'M2.5 8h11',
  sidebar: BOX + 'M6.5 2.5v11',
  tv: 'M4.5 3h7a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM5.5 13.5h5',
  help: 'M8 13.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11ZM6.3 6.3A1.8 1.8 0 1 1 8.8 8c-.5.3-.8.6-.8 1.2M8 11.2h.01',
  pencil: 'M3 13l.5-2.7a1 1 0 0 1 .3-.5l6.4-6.4a1.4 1.4 0 0 1 2 0l.9.9a1.4 1.4 0 0 1 0 2l-6.4 6.4a1 1 0 0 1-.5.3ZM9 4.8l2.2 2.2',
  up: 'M4 10l4-4 4 4',
  down: 'M4 6l4 4 4-4',
  chevron: 'M6 4l4 4-4 4',
  back: 'M10 4L6 8l4 4',
  x: 'M4 4l8 8M12 4l-8 8',
  plus: 'M8 3.5v9M3.5 8h9',
  check: 'M3.5 8.5l3 3 6-7',
  play: 'M5.5 3.8v8.4a.8.8 0 0 0 1.2.7l6.3-4.2a.8.8 0 0 0 0-1.3L6.7 3.1a.8.8 0 0 0-1.2.7Z',
  play2: 'M5.5 3.8v8.4a.8.8 0 0 0 1.2.7l6.3-4.2a.8.8 0 0 0 0-1.3L6.7 3.1a.8.8 0 0 0-1.2.7Z',
  stop: 'M5.5 4h5a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 4 10.5v-5A1.5 1.5 0 0 1 5.5 4Z',
  trash: 'M3 4.5h10M6.5 4.5V3.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M4.5 4.5l.5 7.5a1.5 1.5 0 0 0 1.5 1.5h3A1.5 1.5 0 0 0 11 12l.5-7.5',
  external: 'M9.5 2.5h4v4M13.5 2.5 8 8M11.5 9v2.5a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2H7',
  eye: 'M1.5 8S4 4 8 4s6.5 4 6.5 4-2.5 4-6.5 4S1.5 8 1.5 8ZM8 9.8a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z',
  eyeOff: 'M2.5 2.5l11 11M6.7 6.7a1.8 1.8 0 0 0 2.6 2.6M4.3 4.9C2.6 6 1.5 8 1.5 8S4 12 8 12c1.2 0 2.2-.3 3.1-.9M7 4.1C7.3 4 7.6 4 8 4c4 0 6.5 4 6.5 4s-.6 1-1.6 2',
  dot: 'M8 8h.01',
  encounter: 'M8 13.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11ZM8 1.5v2.5M8 12v2.5M1.5 8H4M12 8h2.5',
  pc: 'M8 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 13.5c0-2.5 2.2-4 5-4s5 1.5 5 4M13 3h.01',
  npc: 'M8 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 13.5c0-2.5 2.2-4 5-4s5 1.5 5 4',
  turn: 'M3 8h8M8 4.5 11.5 8 8 11.5M13.5 3.5v9',
  damage: 'M8 13.5S2.5 10 2.5 6a3 3 0 0 1 5.5-1.6A3 3 0 0 1 13.5 6c0 4-5.5 7.5-5.5 7.5ZM6.5 8h3',
  heal: 'M8 13.5S2.5 10 2.5 6a3 3 0 0 1 5.5-1.6A3 3 0 0 1 13.5 6c0 4-5.5 7.5-5.5 7.5ZM8 6.5v3M6.5 8h3',
  cond: 'M8 13.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11ZM8 8h.01',
  explorer: 'M2.5 12.5v-8a1 1 0 0 1 1-1h3l1.5 1.5h4.5a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1Z',
}

export default function Icon({ name, size = 16, title }: { name: keyof typeof P | string; size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} className="icon">
      {title && <title>{title}</title>}
      <path d={P[name] ?? P.dot} />
    </svg>
  )
}
