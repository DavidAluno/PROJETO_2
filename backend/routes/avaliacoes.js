const express = require('express')
const router = express.Router()
const pool = require('../db')
const { auth, tipo } = require('../middleware/auth')
const { requiredId } = require('../utils/validation')

router.post('/criar', auth, tipo('cliente'), async (req, res) => {
  const { agendamento_id, nota, comentario } = req.body
  const score = Number(nota)
  let agendamentoId
  try { agendamentoId = requiredId(agendamento_id, 'ID de agendamento') } catch (error) { return res.status(error.status || 400).json({ sucesso: false, erro: error.message }) }
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ sucesso: false, erro: 'Escolha um atendimento concluído e uma nota entre 1 e 5' })
  }
  if (comentario !== undefined && (typeof comentario !== 'string' || comentario.trim().length > 600)) return res.status(400).json({ sucesso: false, erro: 'O comentário deve ter no máximo 600 caracteres' })
  try {
    const booking = await pool.query(
      `SELECT id, barbearia_id FROM agendamentos
       WHERE id = $1 AND cliente_id = $2 AND status = 'concluido'`, [agendamentoId, req.usuario.id]
    )
    if (!booking.rows.length) return res.status(403).json({ sucesso: false, erro: 'Só é possível avaliar um atendimento seu que já foi concluído' })
    const result = await pool.query(
      `INSERT INTO avaliacoes (cliente_id, barbearia_id, agendamento_id, nota, comentario)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
       [req.usuario.id, booking.rows[0].barbearia_id, agendamentoId, score, comentario?.trim() || null]
    )
    res.status(201).json({ sucesso: true, dados: result.rows[0] })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ sucesso: false, erro: 'Este atendimento já foi avaliado' })
    res.status(500).json({ sucesso: false, erro: 'Não foi possível publicar sua avaliação' })
  }
})

router.get('/barbearia/:id', async (req, res) => {
  try {
    const barbeariaId = requiredId(req.params.id, 'ID de barbearia')
    const result = await pool.query(
      `SELECT a.*, u.nome AS nome_cliente FROM avaliacoes a
       JOIN usuarios u ON a.cliente_id = u.id WHERE a.barbearia_id = $1 ORDER BY a.criado_em DESC`,
       [barbeariaId]
    )
    res.json({ sucesso: true, dados: result.rows })
  } catch (error) { res.status(error.status || 500).json({ sucesso: false, erro: error.status ? error.message : 'Não foi possível carregar as avaliações' }) }
})

module.exports = router
