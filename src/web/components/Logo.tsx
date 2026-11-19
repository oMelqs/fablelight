// Fablelight mark (direction A): lantern outline + indigo flame; wordmark in Geist 600.
export default function Logo({ height = 28 }: { height?: number }) {
  return (
    <svg className="logo" height={height} viewBox="9 0 136 32" role="img" aria-label="Fablelight" style={{ width: 'auto', overflow: 'visible' }}>
      <g fill="none" stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.5 7.5V6.5a2.5 2.5 0 0 1 5 0v1" /><path d="M9.5 12 12.5 7.5h7l3 4.5Z" /><path d="M11.5 12v12M20.5 12v12M9 24.5h14" />
      </g>
      <path fill="var(--ac)" d="M16 14.2c1.9 1.9 2.8 3.3 2.8 4.6a2.8 2.8 0 0 1-5.6 0c0-1.3.9-2.7 2.8-4.6Z" />
      <text x="32" y="23.2" fontFamily="Geist,sans-serif" fontWeight="600" fontSize="24" letterSpacing="-.7" fill="var(--text)">fablelight</text>
    </svg>
  )
}
