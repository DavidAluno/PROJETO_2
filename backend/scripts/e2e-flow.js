/*
 * Smoke test de integração para demonstração do TCC.
 * Requer a API em http://localhost:3001. Cria dados isolados e os remove ao terminar.
 */
const pool = require('../db')

const baseUrl = process.env.TEST_API_URL || 'http://localhost:3001'
const tag = `e2e-${Date.now()}`
const password = 'SenhaDeTeste!2026'
const ids = {}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options)
  return { status: response.status, body: await response.json().catch(() => ({})) }
}

function auth(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function brazilDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000))
  const get = (type) => parts.find((part) => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

async function cleanup() {
  if (ids.appointment) await pool.query('DELETE FROM avaliacoes_clientes WHERE agendamento_id = $1', [ids.appointment])
  if (ids.shop) await pool.query('DELETE FROM avaliacoes WHERE barbearia_id = $1', [ids.shop])
  if (ids.shop) await pool.query('DELETE FROM favoritos WHERE barbearia_id = $1', [ids.shop])
  if (ids.appointment) await pool.query('DELETE FROM agendamentos WHERE id = $1', [ids.appointment])
  const users = [ids.barber, ids.client].filter(Boolean)
  if (users.length) await pool.query('DELETE FROM notificacoes WHERE usuario_id = ANY($1)', [users])
  if (ids.shop) await pool.query('DELETE FROM barbearias WHERE id = $1', [ids.shop])
  if (ids.client) await pool.query('DELETE FROM usuarios WHERE id = $1', [ids.client])
  if (ids.barber) await pool.query('DELETE FROM usuarios WHERE id = $1', [ids.barber])
}

async function run() {
  try {
    const barberEmail = `barber-${tag}@example.test`
    const clientEmail = `client-${tag}@example.test`
    const barber = await request('/usuarios/cadastrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'Barbeiro E2E', email: barberEmail, senha: password, tipo: 'barbeiro' }) })
    const client = await request('/usuarios/cadastrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'Cliente E2E', email: clientEmail, senha: password, tipo: 'cliente' }) })
    assert(barber.status === 201 && client.status === 201, 'Falha ao cadastrar usuários temporários')
    ids.barber = barber.body.dados.id
    ids.client = client.body.dados.id

    const barberLogin = await request('/usuarios/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: barberEmail, senha: password }) })
    const clientLogin = await request('/usuarios/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: clientEmail, senha: password }) })
    assert(barberLogin.status === 200 && clientLogin.status === 200, 'Falha no login')

    const shop = await request('/barbearias/cadastrar', { method: 'POST', headers: auth(barberLogin.body.dados.token), body: JSON.stringify({ nome: `Barbearia ${tag}`, endereco: 'Rua de Teste, 100 - Araraquara', latitude: -21.7946, longitude: -48.1766 }) })
    assert(shop.status === 201, `Falha ao cadastrar barbearia: ${shop.body.erro}`)
    ids.shop = shop.body.dados.id

    const service = await request('/servicos', { method: 'POST', headers: auth(barberLogin.body.dados.token), body: JSON.stringify({ nome: 'Corte E2E', preco: 42, duracao_minutos: 30 }) })
    assert(service.status === 201, `Falha ao cadastrar serviço: ${service.body.erro}`)

    const periods = Array.from({ length: 7 }, (_, dia_semana) => ({ dia_semana, inicio: '09:00', fim: '18:00' }))
    const hours = await request('/agenda/funcionamento', { method: 'PUT', headers: auth(barberLogin.body.dados.token), body: JSON.stringify({ periodos: periods }) })
    assert(hours.status === 200, `Falha ao salvar horários: ${hours.body.erro}`)

    const available = await request(`/agenda/horarios?barbearia_id=${ids.shop}&servico_id=${service.body.dados.id}&data=${brazilDate()}`)
    assert(available.status === 200 && available.body.dados.horarios.length, 'Nenhum horário livre foi retornado')
    const slot = available.body.dados.horarios[0]

    const booking = await request('/agendamentos/criar', { method: 'POST', headers: auth(clientLogin.body.dados.token), body: JSON.stringify({ barbearia_id: ids.shop, servico_id: service.body.dados.id, data_hora: slot.data_hora }) })
    assert(booking.status === 201, `Falha na reserva: ${booking.body.erro}`)
    ids.appointment = booking.body.dados.id

    const slotStart = new Date(slot.data_hora)
    const overlappingBlock = await request('/agenda/bloqueios', {
      method: 'POST', headers: auth(barberLogin.body.dados.token),
      body: JSON.stringify({ inicio: new Date(slotStart.getTime() + 15 * 60 * 1000).toISOString(), fim: new Date(slotStart.getTime() + 45 * 60 * 1000).toISOString(), motivo: 'Teste de sobreposição' })
    })
    assert(overlappingBlock.status === 409, 'Um bloqueio parcialmente sobreposto deveria ser recusado')

    const duplicate = await request('/agendamentos/criar', { method: 'POST', headers: auth(clientLogin.body.dados.token), body: JSON.stringify({ barbearia_id: ids.shop, servico_id: service.body.dados.id, data_hora: slot.data_hora }) })
    assert(duplicate.status === 409, 'A dupla reserva deveria ter sido bloqueada')

    const confirmation = await request(`/agendamentos/${ids.appointment}/status`, { method: 'PATCH', headers: auth(barberLogin.body.dados.token), body: JSON.stringify({ status: 'confirmado' }) })
    assert(confirmation.status === 200, `Falha ao confirmar: ${confirmation.body.erro}`)
    const earlyCompletion = await request(`/agendamentos/${ids.appointment}/status`, { method: 'PATCH', headers: auth(barberLogin.body.dados.token), body: JSON.stringify({ status: 'concluido' }) })
    assert(earlyCompletion.status === 409, 'Um atendimento futuro não pode ser concluído')
    await pool.query("UPDATE agendamentos SET data_hora = NOW() - INTERVAL '1 minute' WHERE id = $1", [ids.appointment])
    const completion = await request(`/agendamentos/${ids.appointment}/status`, { method: 'PATCH', headers: auth(barberLogin.body.dados.token), body: JSON.stringify({ status: 'concluido' }) })
    assert(completion.status === 200, `Falha ao concluir: ${completion.body.erro}`)

    const customerReview = await request('/avaliacoes/criar', { method: 'POST', headers: auth(clientLogin.body.dados.token), body: JSON.stringify({ agendamento_id: ids.appointment, nota: 5, comentario: 'Teste automatizado.' }) })
    const barberReview = await request('/avaliacoes-clientes', { method: 'POST', headers: auth(barberLogin.body.dados.token), body: JSON.stringify({ agendamento_id: ids.appointment, nota: 5, comentario: 'Cliente pontual.' }) })
    assert(customerReview.status === 201 && barberReview.status === 201, 'Falha nas avaliações bilaterais')

    const favorite = await request(`/favoritos/${ids.shop}`, { method: 'POST', headers: auth(clientLogin.body.dados.token) })
    const notifications = await request('/notificacoes', { headers: auth(clientLogin.body.dados.token) })
    const dashboard = await request('/agendamentos/dashboard', { headers: auth(barberLogin.body.dados.token) })
    assert(favorite.status === 201 && notifications.status === 200 && notifications.body.dados.length >= 2, 'Favoritos ou notificações falharam')
    assert(dashboard.status === 200 && dashboard.body.dados.concluidosRecentes.some((item) => item.id === ids.appointment && item.status === 'concluido'), 'Dashboard não retornou o atendimento concluído')
    console.log('E2E OK: reserva real, proteção contra dupla reserva, avaliações bilaterais, favoritos, notificações e dashboard.')
  } finally {
    await cleanup()
    await pool.end()
  }
}

run().catch((error) => { console.error(`E2E FAILED: ${error.message}`); process.exitCode = 1 })
