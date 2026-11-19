import './combat.css'

/** Die picker: value is the number of sides (0 = none). */
export default function DieSelect({ value, dice, onChange }: { value?: number; dice: number[]; onChange: (v: number) => void }) {
  return (
    <select className="input cb-die" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))}>
      <option value={0}>—</option>
      {value && !dice.includes(value) && <option value={value}>d{value}</option>}
      {dice.map((d) => <option key={d} value={d}>d{d}</option>)}
    </select>
  )
}
