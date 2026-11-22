const express = require('express')
const router = express.Router()
const pool = require('../db')
const { auth, tipo } = require('../middleware/auth')
const { assertSlotAvailable } = require('../utils/availability')
const { createNotification, deliverNotificationEmail } = require('../utils/notifications')
const { bookingLimiter } = require('../middleware/rateLimiters')
const { URGENT_COOLDOWN_MINUTES, expireStaleAppointments } = require('../utils/bookingLifecycle')
const { requiredId } = require('../utils/validation')

const STATUS_PERMITIDOS = ['pendente', 'urgente', 'confirmado', 'recusado', 'cancelado', 'concluido', 'expirado']
const STATUS_ATIVOS = ['pendente', 'confirmado', 'urgente']
const MAX_ACTIVE_BOOKINGS_PER_SHOP = Math.max(1, Number.parseInt(process.env.MAX_ACTIVE_BOOKINGS_PER_CLIENT_BARBERSHOP, 10) || 2)
const TRANSICOES_STATUS = {
  pendente: ['confirmado', 'recusado'],
  urgente: ['confirmado', 'recusado'],
  confirmado: ['concluido']
}

async function notify(db, usuarioId, tipo, titulo, mensagem) {
  const notification = await createNotification(db, usuarioId, tipo, titulo, mensagem)
  return () => {
    void deliverNotificationEmail(notification.id).catch((error) => {
      console.error('Falha ao entregar notificação por e-mail:', error.message)
    })
  }
}

async function getUserName(db, userId) {
  const result = await db.query('SELECT nome FROM usuarios WHERE id = $1', [userId])
  return result.rows[0]?.nome || 'Um usuário'
}

async function getClientAppointments(clienteId) {
  await expireStaleAppointments(pool)
  return pool.query(
    `SELECT a.*, s.nome AS servico, b.nome AS nome_barbearia, b.endereco AS endereco_barbearia, b.latitude, b.longitude,
      EXISTS(SELECT 1 FROM avaliacoes av WHERE av.agendamento_id = a.id) AS avaliado
     FROM agendamentos a JOIN barbearias b ON a.barbearia_id = b.id
     JOIN servicos s ON s.id = a.servico_id
     WHERE a.cliente_id = $1 ORDER BY a.data_hora DESC`,
    [clienteId]
  )
}

router.post('/criar', bookingLimiter, auth, tipo('cliente'), async (req, res) => {
  const { barbearia_id, servico_id, data_hora, urgente = false } = req.body
  if (!Number.isInteger(Number(barbearia_id)) || !Number.isInteger(Number(servico_id))) {
    return res.status(400).json({ sucesso: false, erro: 'Escolha uma barbearia e um serviço válido' })
  }
  if (!urgente && !data_hora) return res.status(400).json({ sucesso: false, erro: 'Escolha um horário disponível' })
  if (typeof urgente !== 'boolean') return res.status(400).json({ sucesso: false, erro: 'O campo urgente deve ser verdadeiro ou falso.' })

  const client = await pool.connect()
  let deliverNotification = null
  try {
    await client.query('BEGIN')
    await expireStaleAppointments(client)
    // Serializa reservas da mesma barbearia e evita que dois clientes reservem a mesma janela.
    await client.query('SELECT pg_advisory_xact_lock($1)', [Number(barbearia_id)])
    const shopResult = await client.query('SELECT b.id, b.nome, b.usuario_id FROM barbearias b WHERE b.id = $1', [barbearia_id])
    if (!shopResult.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ sucesso: false, erro: 'Barbearia não encontrada' })
    }
    const shop = shopResult.rows[0]
    const activeBookings = await client.query(
      `SELECT COUNT(*)::int AS total FROM agendamentos
       WHERE cliente_id = $1 AND barbearia_id = $2 AND status = ANY($3)`,
      [req.usuario.id, shop.id, STATUS_ATIVOS]
    )
    if (activeBookings.rows[0].total >= MAX_ACTIVE_BOOKINGS_PER_SHOP) {
      await client.query('ROLLBACK')
      return res.status(409).json({ sucesso: false, erro: `Você já possui ${MAX_ACTIVE_BOOKINGS_PER_SHOP} pedidos ativos nesta barbearia.` })
    }
    if (urgente) {
      const recentUrgent = await client.query(
        `SELECT 1 FROM agendamentos
         WHERE cliente_id = $1 AND barbearia_id = $2 AND urgente = TRUE
           AND criado_em > NOW() - ($3::int * INTERVAL '1 minute') LIMIT 1`,
        [req.usuario.id, shop.id, URGENT_COOLDOWN_MINUTES]
      )
      if (recentUrgent.rows.length) {
        await client.query('ROLLBACK')
        return res.status(429).json({ sucesso: false, erro: `Aguarde ${URGENT_COOLDOWN_MINUTES} minutos antes de solicitar outro encaixe nesta barbearia.` })
      }
    }

    let service
    let bookingDate = data_hora
    if (urgente) {
      const serviceResult = await client.query('SELECT id, nome, preco, duracao_minutos FROM servicos WHERE id = $1 AND barbearia_id = $2 AND ativo = TRUE', [servico_id, barbearia_id])
      if (!serviceResult.rows.length) {
        await client.query('ROLLBACK')
        return res.status(404).json({ sucesso: false, erro: 'Serviço não disponível nessa barbearia' })
      }
      service = serviceResult.rows[0]
      bookingDate = new Date().toISOString()
    } else {
      service = await assertSlotAvailable(client, { barbeariaId: Number(barbearia_id), servicoId: Number(servico_id), dateTime: data_hora })
    }

    const result = await client.query(
      `INSERT INTO agendamentos (cliente_id, barbearia_id, servico_id, data_hora, urgente, valor, duracao_minutos, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
       [req.usuario.id, barbearia_id, service.id, bookingDate, urgente, service.preco, service.duracao_minutos, urgente ? 'urgente' : 'pendente']
    )
    const appointment = result.rows[0]
    const clientName = await getUserName(client, req.usuario.id)
    deliverNotification = await notify(
      client,
      shop.usuario_id,
      urgente ? 'corte_urgente' : 'novo_agendamento',
      urgente ? 'Novo pedido de encaixe' : 'Novo pedido de agendamento',
      `${clientName} solicitou ${service.nome} na ${shop.nome}.`
    )
    await client.query('COMMIT')
    deliverNotification?.()
    res.status(201).json({ sucesso: true, dados: appointment })
  } catch (error) {
    await client.query('ROLLBACK')
    res.status(error.status || 500).json({ sucesso: false, erro: error.status ? error.message : 'Não foi possível confirmar o agendamento. Tente novamente.' })
  } finally { client.release() }
})

router.get('/barbearia/:id', auth, tipo('barbeiro'), async (req, res) => {
  try {
    const barbeariaId = requiredId(req.params.id, 'ID de barbearia')
    await expireStaleAppointments(pool)
    const result = await pool.query(
      `SELECT a.*, s.nome AS servico, u.nome AS nome_cliente, u.email AS email_cliente
       FROM agendamentos a JOIN usuarios u ON a.cliente_id = u.id
       JOIN barbearias b ON a.barbearia_id = b.id
       JOIN servicos s ON s.id = a.servico_id
       WHERE a.barbearia_id = $1 AND b.usuario_id = $2
       ORDER BY CASE WHEN a.status = 'urgente' THEN 0 ELSE 1 END, a.data_hora ASC`,
       [barbeariaId, req.usuario.id]
    )
    res.json({ sucesso: true, dados: result.rows })
  } catch (error) { res.status(error.status || 500).json({ sucesso: false, erro: error.status ? error.message : 'Não foi possível carregar a agenda' }) }
})

// Compatibilidade com a rota antiga, agora sem expor a agenda de outros clientes.
router.get('/cliente/:id', auth, tipo('cliente'), async (req, res) => {
  let clienteId
  try { clienteId = requiredId(req.params.id, 'ID de cliente') } catch (error) { return res.status(error.status || 400).json({ sucesso: false, erro: error.message }) }
  if (clienteId !== req.usuario.id) return res.status(403).json({ sucesso: false, erro: 'Sem permissão para acessar estes agendamentos' })
  try {
    const result = await getClientAppointments(req.usuario.id)
    res.json({ sucesso: true, dados: result.rows })
  } catch { res.status(500).json({ sucesso: false, erro: 'Não foi possível carregar seus agendamentos' }) }
})

router.get('/meus', auth, tipo('cliente'), async (req, res) => {
  try {
    const result = await getClientAppointments(req.usuario.id)
    res.json({ sucesso: true, dados: result.rows })
  } catch { res.status(500).json({ sucesso: false, erro: 'Não foi possível carregar seus agendamentos' }) }
})

router.get('/dashboard', auth, tipo('barbeiro'), async (req, res) => {
  try {
    await expireStaleAppointments(pool)
    const shop = await pool.query('SELECT id, nome, descricao, especialidades, endereco, latitude, longitude, disponivel FROM barbearias WHERE usuario_id = $1', [req.usuario.id])
    if (!shop.rows.length) return res.json({ sucesso: true, dados: { barbearia: null, metricas: null, concluidosRecentes: [] } })
    const barbearia = shop.rows[0]
    const [metrics, upcoming] = await Promise.all([
      pool.query(
        `WITH contexto AS (
           SELECT date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo' AS inicio_hoje
         )
         SELECT
          COUNT(*) FILTER (WHERE data_hora >= contexto.inicio_hoje AND data_hora < contexto.inicio_hoje + INTERVAL '1 day' AND status = 'concluido')::int AS atendimentos_hoje,
          COALESCE(SUM(valor) FILTER (WHERE data_hora >= contexto.inicio_hoje AND data_hora < contexto.inicio_hoje + INTERVAL '1 day' AND status = 'concluido'), 0) AS faturamento_hoje,
          COALESCE((SELECT ROUND(AVG(nota)::numeric, 1) FROM avaliacoes WHERE barbearia_id = $1), 0) AS avaliacao_media,
          COUNT(DISTINCT cliente_id) FILTER (WHERE status = 'concluido')::int AS clientes_atendidos,
          COUNT(*) FILTER (WHERE status = ANY($2) AND (urgente OR data_hora >= NOW()))::int AS pedidos_ativos,
          COUNT(*) FILTER (WHERE status = 'concluido')::int AS atendimentos_total
         FROM agendamentos CROSS JOIN contexto WHERE barbearia_id = $1`, [barbearia.id, STATUS_ATIVOS]
      ),
      pool.query(
        `SELECT a.*, s.nome AS servico, u.nome AS nome_cliente FROM agendamentos a JOIN usuarios u ON u.id = a.cliente_id
         JOIN servicos s ON s.id = a.servico_id
         WHERE a.barbearia_id = $1 AND a.status = 'concluido' AND a.data_hora >= NOW() - INTERVAL '30 days'
         ORDER BY a.data_hora DESC LIMIT 12`, [barbearia.id]
      )
    ])
    res.json({ sucesso: true, dados: { barbearia, metricas: metrics.rows[0], concluidosRecentes: upcoming.rows } })
  } catch { res.status(500).json({ sucesso: false, erro: 'Não foi possível carregar seu painel' }) }
})

router.get('/pendentes', auth, tipo('barbeiro'), async (req, res) => {
  const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1)
  const limite = Math.min(50, Math.max(1, Number.parseInt(req.query.limite, 10) || 20))
  const offset = (pagina - 1) * limite
  try {
    await expireStaleAppointments(pool)
    const shop = await pool.query('SELECT id FROM barbearias WHERE usuario_id = $1', [req.usuario.id])
    if (!shop.rows.length) return res.json({ sucesso: true, dados: { itens: [], paginacao: { pagina, limite, total: 0, totalPaginas: 0 } } })
    const barbeariaId = shop.rows[0].id
    const [count, rows] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM agendamentos WHERE barbearia_id = $1 AND status = ANY($2) AND (urgente OR data_hora >= NOW())', [barbeariaId, STATUS_ATIVOS]),
      pool.query(
        `SELECT a.*, s.nome AS servico, u.nome AS nome_cliente FROM agendamentos a JOIN usuarios u ON u.id = a.cliente_id
         JOIN servicos s ON s.id = a.servico_id
         WHERE a.barbearia_id = $1 AND a.status = ANY($2) AND (a.urgente OR a.data_hora >= NOW())
         ORDER BY CASE WHEN a.status = 'urgente' THEN 0 ELSE 1 END, a.data_hora ASC LIMIT $3 OFFSET $4`,
        [barbeariaId, STATUS_ATIVOS, limite, offset]
      )
    ])
    const total = count.rows[0].total
    return res.json({ sucesso: true, dados: { itens: rows.rows, paginacao: { pagina, limite, total, totalPaginas: Math.ceil(total / limite) } } })
  } catch (error) {
    console.error('Falha ao listar pedidos ativos:', error)
    return res.status(500).json({ sucesso: false, erro: 'Não foi possível carregar os pedidos ativos.' })
  }
})

router.patch('/:id/cancelar', auth, tipo('cliente'), async (req, res) => {
  let appointmentId
  try { appointmentId = requiredId(req.params.id, 'ID de agendamento') } catch (error) { return res.status(error.status || 400).json({ sucesso: false, erro: error.message }) }
  const client = await pool.connect()
  let deliverNotification = null
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `UPDATE agendamentos a SET status = 'cancelado'
       FROM barbearias b WHERE a.id = $1 AND a.cliente_id = $2 AND a.barbearia_id = b.id
         AND a.status = ANY($3) AND (a.urgente OR a.data_hora > NOW())
       RETURNING a.*, b.usuario_id, b.nome AS nome_barbearia`,
       [appointmentId, req.usuario.id, ['pendente', 'confirmado']]
    )
    if (!result.rows.length) {
      await client.query('ROLLBACK')
      return res.status(409).json({ sucesso: false, erro: 'Este agendamento não pode mais ser cancelado' })
    }
    const appointment = result.rows[0]
    const service = await client.query('SELECT nome FROM servicos WHERE id = $1', [appointment.servico_id])
    const clientName = await getUserName(client, req.usuario.id)
    deliverNotification = await notify(client, appointment.usuario_id, 'cancelamento', 'Cliente cancelou um horário', `${clientName} cancelou ${service.rows[0]?.nome || 'um serviço'}.`)
    await client.query('COMMIT')
    deliverNotification?.()
    res.json({ sucesso: true, dados: appointment })
  } catch (error) {
    await client.query('ROLLBACK')
    res.status(error.status || 500).json({ sucesso: false, erro: error.status ? error.message : 'Não foi possível cancelar o agendamento' })
  } finally { client.release() }
})

router.patch('/:id/status', auth, tipo('barbeiro'), async (req, res) => {
  const { status } = req.body
  if (!STATUS_PERMITIDOS.includes(status)) return res.status(400).json({ sucesso: false, erro: 'Status inválido para esta ação' })
  let appointmentId
  try { appointmentId = requiredId(req.params.id, 'ID de agendamento') } catch (error) { return res.status(error.status || 400).json({ sucesso: false, erro: error.message }) }
  const client = await pool.connect()
  let deliverNotification = null
  try {
    await client.query('BEGIN')
    const currentResult = await client.query(
      `SELECT a.*, s.nome AS servico, b.nome AS nome_barbearia, u.nome AS nome_barbeiro
       FROM agendamentos a JOIN barbearias b ON a.barbearia_id = b.id
       JOIN usuarios u ON u.id = b.usuario_id
       JOIN servicos s ON s.id = a.servico_id
       WHERE a.id = $1 AND b.usuario_id = $2 FOR UPDATE OF a`,
       [appointmentId, req.usuario.id]
    )
    if (!currentResult.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ sucesso: false, erro: 'Agendamento não encontrado' })
    }
    const current = currentResult.rows[0]
    if (!TRANSICOES_STATUS[current.status]?.includes(status)) {
      await client.query('ROLLBACK')
      return res.status(409).json({ sucesso: false, erro: 'Esta mudança de status não é permitida para o agendamento atual' })
    }
    if (status === 'confirmado' && !current.urgente) {
      await assertSlotAvailable(client, {
        barbeariaId: current.barbearia_id,
        servicoId: current.servico_id,
        dateTime: current.data_hora,
        ignoreAppointmentId: current.id
      })
    }
    if (status === 'concluido' && new Date(current.data_hora) > new Date()) {
      await client.query('ROLLBACK')
      return res.status(409).json({ sucesso: false, erro: 'Um atendimento só pode ser concluído depois do horário marcado' })
    }
    const result = await client.query(
      'UPDATE agendamentos SET status = $1 WHERE id = $2 RETURNING *',
      [status, current.id]
    )
    const appointment = { ...current, ...result.rows[0] }
    const messages = {
      confirmado: ['Agendamento confirmado', `${appointment.nome_barbeiro} confirmou seu horário de ${appointment.servico} na ${appointment.nome_barbearia}.`],
      recusado: ['Pedido recusado', `${appointment.nome_barbeiro} não conseguiu atender seu pedido na ${appointment.nome_barbearia}.`],
      concluido: ['Como foi seu atendimento?', `${appointment.nome_barbeiro} concluiu seu corte na ${appointment.nome_barbearia}. Avalie sua experiência.`]
    }
    if (messages[status]) deliverNotification = await notify(client, appointment.cliente_id, `agendamento_${status}`, ...messages[status])
    await client.query('COMMIT')
    deliverNotification?.()
    res.json({ sucesso: true, dados: appointment })
  } catch (error) {
    await client.query('ROLLBACK')
    res.status(error.status || 500).json({ sucesso: false, erro: error.status ? error.message : 'Não foi possível atualizar o agendamento' })
  } finally { client.release() }
})

module.exports = router
