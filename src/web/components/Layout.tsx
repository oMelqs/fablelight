import { Link, NavLink, Outlet } from 'react-router-dom'
import SearchPalette from './books/SearchPalette'
import Logo from './Logo'

const NAV = [
  ['/', 'Campanhas', true],
  ['/biblioteca/sistemas', 'Sistemas', false],
  ['/biblioteca/bestiario', 'Bestiário', false],
  ['/biblioteca/livros', 'Livros', false],
  ['/biblioteca/audio', 'Áudio', false],
] as const

/** Shell for the home and library routes. Campaigns use the Workspace instead. */
export default function Layout() {
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand"><Logo /></Link>
        <nav className="topnav" aria-label="Navegação">
          {NAV.map(([to, label, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>)}
        </nav>
      </header>
      <div className="workbench"><Outlet /></div>
      <SearchPalette />
    </div>
  )
}
