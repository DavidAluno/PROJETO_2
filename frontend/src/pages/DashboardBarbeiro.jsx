import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, formatarDataHora, formatarValor } from '../api'
import { AppShell } from '../components/AppShell'
import { Badge, Button, EmptyState, ErrorState, LoadingState, Modal, StatusBadge } from '../components/ui'
import { useToast } from '../contexts/ToastContext'

export default function DashboardBarbeiro() {
  const [dashboard, setDashboard] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [changing, setChanging] = useState(null)
  const [reviewing, setReviewing] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  async function load(page = 1, append = false) {
    if (append) setLoadingMore(true)
    else { setLoading(true); setError('') }
    try {
      const [overview, pending] = await Promise.all([
        apiFetch('/agendamentos/dashboard'),
        apiFetch(`/agendamentos/pendentes?pagina=${page}&limite=20`)
      ])
      setDashboard(overview)
      setAppointments((current) => append ? [...current, ...pending.itens] : pending.itens)
      setPagination(pending.paginacao)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function toggleAvailability() {
    if (!dashboard?.barbearia) return
    const current = dashboard.barbearia
    try {
      const updated = await apiFetch(`/barbearias/${current.id}/disponibilidade`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disponivel: !current.disponivel }) })
      setDashboard({ ...dashboard, barbearia: { ...current, ...updated } })
      toast.success(updated.disponivel ? 'Você está disponível para novos clientes.' : 'Você não receberá novos encaixes agora.')
    } catch (actionError) { toast.error(actionError.message) }
  }

  async function updateStatus(appointment, status) {
    setChanging(appointment.id)
    try {
      await apiFetch(`/agendamentos/${appointment.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      toast.success(status === 'confirmado' ? 'Agendamento confirmado.' : status === 'recusado' ? 'Pedido recusado.' : 'Atendimento concluído.')
      await load()
    } catch (actionError) { toast.error(actionError.message) } finally { setChanging(null) }
  }

  async function reviewClient(event) {
    event.preventDefault()
    if (!reviewing) return
    setSubmittingReview(true)
    try {
      await apiFetch('/avaliacoes-clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agendamento_id: reviewing.id, nota: rating, comentario: comment.trim() }) })
      toast.success('Avaliação do cliente registrada.')
      setReviewing(null); setComment(''); setRating(5)
    } catch (reviewError) { toast.error(reviewError.message) } finally { setSubmittingReview(false) }
  }

  if (loading) return <AppShell role="barbeiro" eyebrow="PAINEL DO BARBEIRO" title="Sua agenda, sem ruído."><LoadingState label="Carregando seu painel"/></AppShell>
  if (error) return <AppShell role="barbeiro" eyebrow="PAINEL DO BARBEIRO" title="Sua agenda, sem ruído."><ErrorState description={error} action={<Button variant="secondary" onClick={() => load()}>Tentar novamente</Button>}/></AppShell>
  if (!dashboard?.barbearia) return <AppShell role="barbeiro" eyebrow="PAINEL DO BARBEIRO" title="Comece mostrando seu trabalho."><EmptyState title="Sua barbearia ainda não está no mapa." description="Cadastre as informações essenciais, depois defina serviços, horários e seu portfólio." action={<Button onClick={() => navigate('/barbeiro/cadastrar')}>Cadastrar minha barbearia</Button>}/></AppShell>

  const { barbearia, metricas, concluidosRecentes = [] } = dashboard
  const visibleAppointments = [...appointments, ...concluidosRecentes]
  return <AppShell role="barbeiro" eyebrow="PAINEL DO BARBEIRO" title={`Olá, ${barbearia.nome}.`} actions={<Badge tone={barbearia.disponivel ? 'success' : 'danger'}>{barbearia.disponivel ? '● Disponível' : '● Pausado'}</Badge>}><div className="bc-barber-dashboard"><section className="bc-barber-hero"><div><p className="bc-kicker">STATUS DA AGENDA</p><h2>{barbearia.disponivel ? 'Pronto para o próximo cliente?' : 'Seu perfil está pausado.'}</h2><p>{barbearia.disponivel ? 'Clientes próximos já conseguem solicitar seus horários.' : 'Volte a ficar disponível quando quiser aparecer no mapa.'}</p></div><Button variant={barbearia.disponivel ? 'danger' : 'primary'} onClick={toggleAvailability}>{barbearia.disponivel ? 'Ficar ocupado' : 'Ficar disponível'}</Button></section><section className="bc-stat-grid"><Stat label="Atendimentos hoje" value={metricas?.atendimentos_hoje || 0} suffix="concluídos"/><Stat label="Faturamento hoje" value={formatarValor(metricas?.faturamento_hoje || 0)} suffix="em atendimentos concluídos"/><Stat label="Avaliação" value={metricas?.avaliacao_media ? `${metricas.avaliacao_media} ★` : 'Novo'} suffix="média dos clientes"/><Stat label="Clientes atendidos" value={metricas?.clientes_atendidos || 0} suffix="no histórico"/></section><section className="bc-barber-shortcuts"><button onClick={() => navigate('/barbeiro/agenda')}><span>◷</span><b>Agenda e serviços</b><small>Defina horários, bloqueie períodos e edite preços.</small></button><button onClick={() => navigate('/barbeiro/portfolio')}><span>▧</span><b>Portfólio</b><small>Mostre cortes que fazem você ser escolhido.</small></button><button onClick={() => navigate('/barbeiro/editar')}><span>⌖</span><b>Perfil no mapa</b><small>Edite endereço, descrição e especialidades.</small></button></section><section className="bc-barber-appointments"><div className="bc-section-title"><div><p className="bc-kicker">PRÓXIMOS ATENDIMENTOS</p><h2>O que vem agora.</h2></div><Button variant="ghost" onClick={() => load()}>Atualizar</Button></div>{visibleAppointments.length ? <div>{visibleAppointments.map((appointment) => <article key={appointment.id}><time>{appointment.urgente ? 'Agora' : new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(appointment.data_hora))}</time><div><h3>{appointment.nome_cliente}</h3><p>{appointment.servico} · {formatarValor(appointment.valor)}</p><small>{appointment.urgente ? 'Pedido de encaixe' : formatarDataHora(appointment.data_hora)}</small></div><StatusBadge status={appointment.status}/><div className="bc-barber-appointment-actions">{['pendente', 'urgente'].includes(appointment.status) && <><Button loading={changing === appointment.id} onClick={() => updateStatus(appointment, 'confirmado')}>Aceitar</Button><Button variant="ghost" onClick={() => updateStatus(appointment, 'recusado')}>Recusar</Button></>}{appointment.status === 'confirmado' && <Button loading={changing === appointment.id} onClick={() => updateStatus(appointment, 'concluido')}>Concluir</Button>}{appointment.status === 'concluido' && <Button variant="secondary" onClick={() => setReviewing(appointment)}>Avaliar cliente</Button>}</div></article>)}{pagination && pagination.pagina < pagination.totalPaginas && <Button variant="secondary" loading={loadingMore} onClick={() => load(pagination.pagina + 1, true)}>Carregar mais pedidos</Button>}</div> : <EmptyState eyebrow="AGENDA LIVRE" title="Nenhum atendimento por enquanto." description="Complete serviços, horários e portfólio para aparecer melhor nas buscas." action={<Button variant="secondary" onClick={() => navigate('/barbeiro/agenda')}>Configurar agenda</Button>}/>}</section></div><Modal open={Boolean(reviewing)} onClose={() => setReviewing(null)} title={`Avaliar ${reviewing?.nome_cliente || 'cliente'}`}><form className="bc-modal-form" onSubmit={reviewClient}><p className="bc-modal-copy">Avalie apenas a experiência deste atendimento concluído.</p><div className="bc-star-picker">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={value <= rating ? 'active' : ''} onClick={() => setRating(value)} aria-label={`${value} estrela${value > 1 ? 's' : ''}`}>★</button>)}</div><label className="bc-field"><span>Comentário <small>(opcional)</small></span><textarea maxLength="600" rows="4" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Conte como foi o atendimento deste cliente."/></label><div className="bc-modal-actions"><Button variant="ghost" onClick={() => setReviewing(null)}>Cancelar</Button><Button type="submit" loading={submittingReview}>Registrar avaliação</Button></div></form></Modal></AppShell>
}

function Stat({ label, value, suffix }) { return <article><span>{label}</span><b>{value}</b><small>{suffix}</small></article> }
