import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { list } from '../api'
import type { Campaign } from '../../shared/types'
import SearchPalette from './books/SearchPalette'
import Icon from './Icon'
import Logo from './Logo'

/** Shell for the hub and library routes. Campaigns use the Workspace instead. */
export default function Layout() {
  const { pathname } = useLocation()
  const [count, setCount] = useState<number>()
  const [help, setHelp] = useState(false)
  useEffect(() => { list<Campaign>('campaigns').then((r) => setCount(r.filter((c) => !c.config?.archived).length), () => {}) }, [pathname])
  useEffect(() => { setHelp(false) }, [pathname])
  useEffect(() => {
    if (!help) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setHelp(false)
    addEventListener('keydown', h)
    return () => removeEventListener('keydown', h)
  }, [help])
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')
  const openSearch = () => dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand"><Logo /></Link>
        <nav className="topnav" aria-label="Navegação">
          <NavLink to="/" end className={({ isActive }) => (isActive || pathname === '/nova-campanha' ? 'active' : '')}>
            <Icon name="campaigns" size={15} />Campanhas{!!count && <span className="topnav-n">{count}</span>}
          </NavLink>
          <NavLink to="/biblioteca" className={cls}><Icon name="books" size={15} />Biblioteca</NavLink>
        </nav>
        <span style={{ flex: 1 }} />
        <button className="btn topbar-search" onClick={openSearch}><Icon name="search" size={14} />Buscar em tudo<kbd>⌘K</kbd></button>
        <div style={{ position: 'relative' }}>
          <button className="btn btn-ghost topbar-ico" aria-label="Ajuda" aria-expanded={help} onClick={() => setHelp((h) => !h)}><Icon name="help" size={16} /></button>
          {help && (
            <div className="topbar-help" role="dialog" aria-label="Atalhos">
              <h4>Atalhos</h4>
              <dl>
                <dt><kbd>⌘K</kbd></dt><dd>Buscar em livros, notas, cenas e criaturas</dd>
                <dt><kbd>N</kbd></dt><dd>Nova campanha</dd>
                <dt><kbd>←</kbd><kbd>→</kbd></dt><dd>Mover entre campanhas</dd>
                <dt><kbd>↵</kbd></dt><dd>Entrar na mesa</dd>
              </dl>
            </div>
          )}
        </div>
      </header>
      <div className="workbench"><Outlet /></div>
      <SearchPalette />
    </div>
  )
}
