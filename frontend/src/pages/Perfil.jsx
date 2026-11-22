import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, getUsuarioLogado } from '../api'
import { AppShell } from '../components/AppShell'
import { Button, EmptyState, ErrorState, LoadingState } from '../components/ui'

export default function Perfil() {
  const user = getUsuarioLogado()
  const [appointments, setAppointments] = useState([])
  const [barberMetrics, setBarberMetrics] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const isBarber = user?.tipo === 'barbeiro'

  async function load() {
    setLoading(true); setError('')
    try {
      const requests = [apiFetch('/notificacoes')]
      if (isBarber) requests.push(apiFetch('/agendamentos/dashboard'))
      else requests.push(apiFetch('/agendamentos/meus'), apiFetch('/favoritos'))
      const results = await Promise.all(requests)
      setNotifications(results[0])
      if (isBarber) setBarberMetrics(results[1]?.metricas || null)
      else { setAppointments(results[1]); setFavorites(results[2]) }
    } catch (loadError) { setError(loadError.message) } finally { setLoading(false) }
  }
  // Carregamento inicial; atualizações posteriores são disparadas pelas ações desta tela.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])
  const stats = useMemo(() => isBarber ? [
    ['Pedidos ativos', barberMetrics?.pedidos_ativos || 0],
    ['Atendimentos', barberMetrics?.atendimentos_total || 0],
    ['Notificações', notifications.filter((item) => !item.lida).length]
  ] : [
    ['Cortes realizados', appointments.filter((item) => item.status === 'concluido').length],
    ['Barbearias salvas', favorites.length],
    ['Notificações', notifications.filter((item) => !item.lida).length]
  ], [appointments, barberMetrics, favorites, isBarber, notifications])
  async function markRead(id) {
    try {
      await apiFetch(`/notificacoes/${id}/lida`, { method: 'PATCH' })
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, lida: true } : item))
    } catch { /* Reading an alert should never break the profile. */ }
  }
  async function markAllRead() {
    try { await apiFetch('/notificacoes/ler/todas', { method: 'PATCH' }); setNotifications((current) => current.map((item) => ({ ...item, lida: true }))) } catch { /* Non-blocking action. */ }
  }
  if (loading) return <AppShell role={isBarber ? 'barbeiro' : 'cliente'} eyebrow="SUA CONTA" title="Perfil e atividade."><LoadingState label="Carregando sua conta"/></AppShell>
  if (error) return <AppShell role={isBarber ? 'barbeiro' : 'cliente'} eyebrow="SUA CONTA" title="Perfil e atividade."><ErrorState description={error} action={<Button variant="secondary" onClick={load}>Tentar novamente</Button>}/></AppShell>
  return <AppShell role={isBarber ? 'barbeiro' : 'cliente'} eyebrow="SUA CONTA" title="Perfil e atividade."><div className="bc-profile-page"><section className="bc-account-hero"><span>{user?.nome?.slice(0, 1).toUpperCase()}</span><div><p className="bc-kicker">{isBarber ? 'PROFISSIONAL BARBERCONNECT' : 'CLIENTE BARBERCONNECT'}</p><h2>{user?.nome}</h2><p>{user?.email}</p></div><Button variant="secondary" onClick={() => navigate(isBarber ? '/barbeiro/agenda' : '/mapa')}>{isBarber ? 'Gerenciar agenda' : 'Explorar mapa'}</Button></section><section className="bc-account-stats">{stats.map(([label, value]) => <article key={label}><b>{value}</b><span>{label}</span></article>)}</section><section className="bc-notification-center"><header><div><p className="bc-kicker">CENTRO DE NOTIFICAÇÕES</p><h2>O que mudou.</h2></div>{notifications.some((item) => !item.lida) && <Button variant="ghost" onClick={markAllRead}>Marcar todas como lidas</Button>}</header>{notifications.length ? <div>{notifications.map((notification) => <button key={notification.id} className={notification.lida ? 'is-read' : ''} onClick={() => markRead(notification.id)}><span>{notification.lida ? '·' : '●'}</span><div><b>{notification.titulo}</b><p>{notification.mensagem}</p><small>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(notification.criado_em))}</small></div></button>)}</div> : <EmptyState eyebrow="TUDO EM DIA" title="Nenhuma notificação por enquanto." description="Quando houver mudanças nos seus agendamentos, elas aparecerão aqui."/>}</section></div></AppShell>
}
