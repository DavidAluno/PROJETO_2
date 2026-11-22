const express = require('express')
const router = express.Router()
const pool = require('../db')
const { auth, tipo } = require('../middleware/auth')
const { getAvailableSlots } = require('../utils/availability')
const { positiveInteger, requiredId } = require('../utils/validation')

async function getOwnedShop(userId) {
  const result = await pool.query('SELECT id, nome FROM barbearias WHERE usuario_id = $1', [userId])
  return result.rows[0]
}

function validDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return false
  const parsed = new Date(`${date}T12:00:00-03:00`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}

router.get('/horarios', async (req, res) => {
  const { barbearia_id, servico_id, data } = req.query
  const barbeariaId = positiveInteger(barbearia_id)
  const servicoId = positiveInteger(servico_id)
  if (!barbeariaId || !servicoId || !validDate(data)) {
    return res.status(400).json({ sucesso: false, erro: 'Informe barbearia, serviço e uma data válida' })
  }
  try {
    const availability = await getAvailableSlots(pool, {
      barbeariaId,
      servicoId,
      date: data
    })
    res.json({
      sucesso: true,
      dados: { servico: availability.service, data, horarios: availability.slots, periodos: availability.hours }
    })
  } catch (error) {
    res.status(error.status || 500).json({ sucesso: false, erro: error.status ? error.message : 'Não foi possível consultar a agenda agora' })
  }
})

router.get('/funcionamento', auth, tipo('barbeiro'), async (req, res) => {
  try {
    const shop = await getOwnedShop(req.usuario.id)
    if (!shop) return res.status(404).json({ sucesso: false, erro: 'Cadastre sua barbearia antes de configurar a agenda' })
    const result = await pool.query('SELECT id, dia_semana, inicio, fim FROM horarios_funcionamento WHERE barbearia_id = $1 ORDER BY dia_semana, inicio', [shop.id])
    res.json({ sucesso: true, dados: { barbearia: shop, periodos: result.rows } })
  } catch { res.status(500).json({ sucesso: false, erro: 'Não foi possível carregar seu horário de funcionamento' }) }
})

router.put('/funcionamento', auth, tipo('barbeiro'), async (req, res) => {
  const { periodos } = req.body
  if (!Array.isArray(periodos)) return res.status(400).json({ sucesso: false, erro: 'Envie os períodos de funcionamento' })
  const invalid = periodos.some((period) => !Number.isInteger(Number(period.dia_semana)) || Number(period.dia_semana) < 0 || Number(period.dia_semana) > 6 || !/^\d{2}:\d{2}$/.test(period.inicio || '') || !/^\d{2}:\d{2}$/.test(period.fim || '') || period.fim <= period.inicio)
  if (invalid) return res.status(400).json({ sucesso: false, erro: 'Revise os dias e intervalos de funcionamento' })
  const client = await pool.connect()
  try {
    const shop = await getOwnedShop(req.usuario.id)
    if (!shop) return res.status(404).json({ sucesso: false, erro: 'Cadastre sua barbearia antes de configurar a agenda' })
    await client.query('BEGIN')
    await client.query('DELETE FROM horarios_funcionamento WHERE barbearia_id = $1', [shop.id])
    for (const period of periodos) {
      await client.query('INSERT INTO horarios_funcionamento (barbearia_id, dia_semana, inicio, fim) VALUES ($1, $2, $3, $4)', [shop.id, Number(period.dia_semana), period.inicio, period.fim])
    }
    await client.query('COMMIT')
    res.json({ sucesso: true, dados: { periodos } })
  } catch {
    await client.query('ROLLBACK')
    res.status(500).json({ sucesso: false, erro: 'Não foi possível salvar os horários' })
  } finally { client.release() }
})

router.get('/bloqueios', auth, tipo('barbeiro'), async (req, res) => {
  try {
    const shop = await getOwnedShop(req.usuario.id)
    if (!shop) return res.status(404).json({ sucesso: false, erro: 'Barbearia não encontrada' })
    const result = await pool.query('SELECT * FROM bloqueios_horario WHERE barbearia_id = $1 AND fim > NOW() ORDER BY inicio', [shop.id])
    res.json({ sucesso: true, dados: result.rows })
  } catch { res.status(500).json({ sucesso: false, erro: 'Não foi possível carregar os bloqueios' }) }
})

router.post('/bloqueios', auth, tipo('barbeiro'), async (req, res) => {
  const { inicio, fim, motivo } = req.body
  const start = new Date(inicio)
  const end = new Date(fim)
  if (typeof motivo !== 'undefined' && (typeof motivo !== 'string' || motivo.trim().length > 180)) {
    return res.status(400).json({ sucesso: false, erro: 'O motivo deve ter no máximo 180 caracteres.' })
  }
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start || start <= new Date()) {
    return res.status(400).json({ sucesso: false, erro: 'Informe um período futuro e válido para bloquear' })
  }
  try {
    const shop = await getOwnedShop(req.usuario.id)
    if (!shop) return res.status(404).json({ sucesso: false, erro: 'Barbearia não encontrada' })
    const overlap = await pool.query(
      `SELECT id FROM agendamentos
       WHERE barbearia_id = $1 AND status = ANY($2)
         AND data_hora < $3
         AND data_hora + make_interval(mins => COALESCE(duracao_minutos, 30)) > $4
       LIMIT 1`,
      [shop.id, ['pendente', 'confirmado', 'urgente'], end.toISOString(), start.toISOString()]
    )
    if (overlap.rows.length) return res.status(409).json({ sucesso: false, erro: 'Existe um agendamento ativo que se sobrepõe a este bloqueio.' })
    const result = await pool.query('INSERT INTO bloqueios_horario (barbearia_id, inicio, fim, motivo) VALUES ($1, $2, $3, $4) RETURNING *', [shop.id, start.toISOString(), end.toISOString(), motivo?.trim() || null])
    res.status(201).json({ sucesso: true, dados: result.rows[0] })
  } catch { res.status(500).json({ sucesso: false, erro: 'Não foi possível bloquear este período' }) }
})

router.delete('/bloqueios/:id', auth, tipo('barbeiro'), async (req, res) => {
  try {
    const blockId = requiredId(req.params.id, 'ID de bloqueio')
    const result = await pool.query(
      `DELETE FROM bloqueios_horario h USING barbearias b
       WHERE h.id = $1 AND h.barbearia_id = b.id AND b.usuario_id = $2 RETURNING h.id`,
       [blockId, req.usuario.id]
    )
    if (!result.rows.length) return res.status(404).json({ sucesso: false, erro: 'Bloqueio não encontrado' })
    res.json({ sucesso: true, dados: { id: blockId } })
  } catch (error) { res.status(error.status || 500).json({ sucesso: false, erro: error.status ? error.message : 'Não foi possível remover o bloqueio' }) }
})

module.exports = router
