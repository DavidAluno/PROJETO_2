import { NavLink, useNavigate } from 'react-router-dom'
import { getUsuarioLogado } from '../api'
import { Avatar, IconButton } from './ui'

const clientItems = [{ to: '/mapa', icon: '⌖', label: 'Explorar' }, { to: '/meus-cortes', icon: '◷', label: 'Cortes' }, { to: '/favoritos', icon: '♡', label: 'Favoritos' }]
const barberItems = [{ to: '/barbeiro', icon: '◫', label: 'Painel' }, { to: '/barbeiro/agenda', icon: '◷', label: 'Agenda' }, { to: '/barbeiro/portfolio', icon: '▧', label: 'Portfólio' }]

export function AppShell({ children, role, title, eyebrow, actions }) {
  const navigate = useNavigate()
  const user = getUsuarioLogado()
  const items = role === 'barbeiro' ? barberItems : clientItems
  function logout() { sessionStorage.removeItem('token'); sessionStorage.removeItem('usuario'); navigate('/') }
  return <div className="bc-app-shell"><header className="bc-topbar"><NavLink to={role === 'barbeiro' ? '/barbeiro' : '/mapa'} className="bc-brand">BARBER<span>CONNECT</span></NavLink><nav className="bc-desktop-nav" aria-label="Navegação principal">{items.map((item) => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}</nav><div className="bc-topbar-actions">{actions}<NavLink to={role === 'cliente' ? '/perfil' : '/barbeiro/perfil'} className="bc-user-link"><Avatar name={user?.nome} size="sm"/><span>{user?.nome?.split(' ')[0] || 'Conta'}</span></NavLink><IconButton label="Sair" onClick={logout}>↗</IconButton></div></header>{(title || eyebrow) && <div className="bc-page-heading"><div>{eyebrow && <p className="bc-kicker">{eyebrow}</p>}{title && <h1>{title}</h1>}</div></div>}<main className="bc-app-content">{children}</main><nav className="bc-bottom-nav" aria-label="Navegação móvel">{items.map((item) => <NavLink key={item.to} to={item.to}><span>{item.icon}</span>{item.label}</NavLink>)}</nav></div>
}
