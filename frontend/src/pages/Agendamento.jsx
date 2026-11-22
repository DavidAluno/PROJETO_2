import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiFetch, formatarDataHora, formatarValor } from '../api'
import { AppShell } from '../components/AppShell'
import { Button, EmptyState, ErrorState, LoadingState, Skeleton } from '../components/ui'
import { useToast } from '../contexts/ToastContext'

function inputDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const parsed = new Date(`${value}T12:00:00`)
  return !Number.isNaN(parsed.getTime()) && inputDate(parsed) === value
}

function dayLabel(value) {
  if (!isValidDate(value)) return 'Data inválida'
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).format(date).replace('.', '')
}

export default function Agendamento() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const barbearia = state?.barbearia
  const initialDate = inputDate(new Date())
  const maxDate = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() + 90)
    return inputDate(date)
  }, [])
  const [services, setServices] = useState(barbearia?.servicos || [])
  const [service, setService] = useState(null)
  const [date, setDate] = useState(initialDate)
  const [slots, setSlots] = useState([])
  const [slot, setSlot] = useState(null)
  const [step, setStep] = useState(1)
  const [loadingServices, setLoadingServices] = useState(Boolean(barbearia && !barbearia.servicos))
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmed, setConfirmed] = useState(null)
  const toast = useToast()
  const nextDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const value = new Date()
    value.setDate(value.getDate() + index)
    return inputDate(value)
  }), [])

  const loadSlots = useCallback(async () => {
    if (!barbearia?.id || !service?.id || !isValidDate(date)) return
    setLoadingSlots(true)
    setSlots([])
    setSlot(null)
    try {
      const data = await apiFetch(`/agenda/horarios?barbearia_id=${barbearia.id}&servico_id=${service.id}&data=${date}`)
      setSlots(data.horarios || [])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoadingSlots(false)
    }
  }, [barbearia, date, service])

  useEffect(() => {
    if (!barbearia || services.length || !loadingServices) return undefined
    let active = true
    apiFetch(`/servicos/barbearia/${barbearia.id}`)
      .then((data) => { if (active) setServices(data) })
      .catch((loadError) => { if (active) setError(loadError.message) })
      .finally(() => { if (active) setLoadingServices(false) })
    return () => { active = false }
  }, [barbearia, loadingServices, services.length])

  useEffect(() => { void loadSlots() }, [loadSlots])

  async function confirm() {
    if (!service || !slot) return
    setSaving(true)
    setError('')
    try {
      const appointment = await apiFetch('/agendamentos/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barbearia_id: barbearia.id, servico_id: service.id, data_hora: slot.data_hora })
      })
      setConfirmed(appointment)
      toast.success('Pedido enviado para a barbearia.')
    } catch (saveError) {
      if (saveError.status === 409) {
        toast.warning('Esse horário acabou de mudar. Escolha outro horário disponível.')
        setStep(3)
        await loadSlots()
      } else {
        setError(saveError.message)
      }
    } finally {
      setSaving(false)
    }
  }

  function updateDate(value) {
    if (!isValidDate(value) || value < initialDate || value > maxDate) {
      setError('Escolha uma data válida nos próximos 90 dias.')
      return
    }
    setError('')
    setDate(value)
  }

  if (!barbearia) return <AppShell role="cliente" eyebrow="AGENDAMENTO" title="Escolha uma barbearia primeiro"><EmptyState title="Seu próximo corte começa no mapa." description="Veja o trabalho, serviços e avaliações antes de escolher um horário." action={<Button onClick={() => navigate('/mapa')}>Explorar barbearias</Button>}/></AppShell>

  if (confirmed) return <AppShell role="cliente" eyebrow="PEDIDO ENVIADO" title="Está quase marcado."><section className="bc-booking-success"><span>✓</span><h2>Pedido enviado.</h2><p>A {barbearia.nome} vai confirmar seu horário. Você acompanha tudo em Meus cortes.</p><div><b>{service.nome}</b><small>{formatarDataHora(confirmed.data_hora)} · {formatarValor(confirmed.valor)}</small></div><Button onClick={() => navigate('/meus-cortes')}>Acompanhar agendamento</Button><Button variant="ghost" onClick={() => navigate('/mapa')}>Voltar ao mapa</Button></section></AppShell>

  return <AppShell role="cliente" eyebrow="AGENDAMENTO" title="Reserve um horário."><div className="bc-booking-layout"><aside className="bc-booking-aside"><p className="bc-kicker">BARBEARIA ESCOLHIDA</p><h2>{barbearia.nome}</h2><p>{barbearia.endereco}</p><ol>{['Serviço', 'Data', 'Horário', 'Confirmar'].map((name, index) => <li className={step >= index + 1 ? 'is-current' : ''} key={name}><span>0{index + 1}</span>{name}</li>)}</ol></aside><section className="bc-booking-main">{error && <ErrorState title="Vamos ajustar isso" description={error} action={<Button variant="secondary" onClick={() => setError('')}>Fechar aviso</Button>}/>} {!error && <>{step === 1 && <section className="bc-booking-step"><p className="bc-kicker">ETAPA 01</p><h2>Qual serviço você quer?</h2><p>Preço e duração vêm direto do cadastro da barbearia.</p>{loadingServices ? <div className="bc-service-skeletons"><Skeleton/><Skeleton/><Skeleton/></div> : services.length ? <div className="bc-service-picker">{services.map((item) => <button key={item.id} onClick={() => setService(item)} className={service?.id === item.id ? 'is-selected' : ''}><span><b>{item.nome}</b><small>{item.duracao_minutos} min</small></span><strong>{formatarValor(item.preco)}</strong></button>)}</div> : <EmptyState title="Serviços em configuração" description="Esta barbearia ainda não publicou serviços para agendamento." action={<Button variant="secondary" onClick={() => navigate('/mapa')}>Ver outras barbearias</Button>}/>} {services.length > 0 && <div className="bc-step-actions"><Button disabled={!service} onClick={() => setStep(2)}>Escolher uma data →</Button></div>}</section>}{step === 2 && <section className="bc-booking-step"><p className="bc-kicker">ETAPA 02</p><h2>Em qual dia?</h2><p>Escolha os próximos dias ou uma data futura.</p><div className="bc-date-picker">{nextDays.map((value) => <button key={value} onClick={() => updateDate(value)} className={date === value ? 'is-selected' : ''}>{value === nextDays[0] ? 'Hoje' : dayLabel(value)}</button>)}</div><label className="bc-field bc-booking-custom-date"><span>Outra data</span><input type="date" min={initialDate} max={maxDate} value={date} onChange={(event) => updateDate(event.target.value)}/></label><div className="bc-step-actions"><Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button><Button onClick={() => setStep(3)}>Ver horários →</Button></div></section>}{step === 3 && <section className="bc-booking-step"><p className="bc-kicker">ETAPA 03 · {dayLabel(date).toUpperCase()}</p><h2>Horários realmente livres.</h2><p>O horário fica reservado somente quando você confirmar.</p>{loadingSlots ? <LoadingState label="Consultando a agenda"/> : slots.length ? <div className="bc-time-grid">{slots.map((item) => <button key={item.data_hora} className={slot?.data_hora === item.data_hora ? 'is-selected' : ''} onClick={() => setSlot(item)}>{item.horario}</button>)}</div> : <EmptyState title="Nenhum horário livre neste dia." description="Tente outra data ou escolha outra barbearia."/>}<div className="bc-step-actions"><Button variant="ghost" onClick={() => setStep(2)}>Voltar</Button><Button disabled={!slot} onClick={() => setStep(4)}>Ver resumo →</Button></div></section>}{step === 4 && <section className="bc-booking-step"><p className="bc-kicker">ETAPA 04</p><h2>Confira antes de enviar.</h2><div className="bc-booking-summary"><div><span>Barbearia</span><b>{barbearia.nome}</b></div><div><span>Serviço</span><b>{service.nome}</b></div><div><span>Quando</span><b>{formatarDataHora(slot.data_hora)}</b></div><div><span>Duração</span><b>{service.duracao_minutos} minutos</b></div><div><span>Total</span><b>{formatarValor(service.preco)}</b></div></div><p className="bc-booking-note">A barbearia confirma seu pedido. Você recebe a atualização no centro de agendamentos.</p><div className="bc-step-actions"><Button variant="ghost" onClick={() => setStep(3)}>Voltar</Button><Button loading={saving} onClick={confirm}>Confirmar agendamento</Button></div></section>}</>}</section></div></AppShell>
}
