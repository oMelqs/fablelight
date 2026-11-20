import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { list } from '../api'
import { LIcon } from './ui'
import './library.css'

const SECTIONS = [
  ['bestiario', 'bestiary', 'Bestiário', 'creatures'],
  ['livros', 'books', 'Livros', 'books'],
  ['audio', 'audio', 'Áudio', 'audio'],
  ['sistemas', 'systems', 'Sistemas', 'systems'],
] as const

/** Library shell: left rail (sections + counts + scope) and the section page in <Outlet/>. */
export default function LibraryLayout() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    const load = () => Promise.all(SECTIONS.map(([, , , t]) => list(t).then((r) => [t, r.length] as const)))
      .then((r) => setCounts(Object.fromEntries(r))).catch(() => {})
    load()
    window.addEventListener('rpgtable:items', load)
    return () => window.removeEventListener('rpgtable:items', load)
  }, [])
  return (
    <div className="lb-shell">
      <aside className="lb-rail" aria-label="Biblioteca">
        <h4>Biblioteca</h4>
        {SECTIONS.map(([to, icon, label, t]) => (
          <NavLink key={to} to={to} className={({ isActive }) => `lb-ri${isActive ? ' on' : ''}`} title={label}>
            <LIcon name={icon} /><span className="tx">{label}</span><span className="ct">{counts[t] ?? ''}</span>
          </NavLink>
        ))}
        <div className="lb-rscope">
          <span>Escopo da biblioteca</span>
          <div className="lb-rscope-v"><LIcon name="campaigns" size={14} />Global, todas as campanhas</div>
          <span className="mono">Itens sem campanha ficam visíveis em todas</span>
        </div>
      </aside>
      <div className="lb-content"><Outlet /></div>
    </div>
  )
}
