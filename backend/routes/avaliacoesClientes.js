const express = require('express')
const router = express.Router()
const pool = require('../db')
const { auth, tipo } = require('../middleware/auth')
const { requiredId } = require('../utils/validation')

router.post('/', auth, tipo('barbeiro'), async (req, res) => {
  const { agendamento_id, nota, comentario } = req.body
  let agendamentoId
  try { agendamentoId = requiredId(agendamento_id, 'ID de agendamento') } catch (error) { return res.status(error.status || 400).json({ sucesso: false, erro: error.message }) }
  if (!Number.isInteger(Number(nota)) || Number(nota) < 1 || Number(nota) > 5) return res.status(400).json({ sucesso: false, erro: 'Informe um agendamento e nota de 1 a 5' })
  if (comentario !== undefined && (typeof comentario !== 'string' || comentario.trim().length > 600)) return res.status(400).json({ sucesso: false, erro: 'O comentário deve ter no máximo 600 caracteres' })
  try {
    const agendamento = await pool.query(`SELECT a.cliente_id FROM agendamentos a JOIN barbearias b ON b.id = a.barbearia_id WHERE a.id = $1 AND b.usuario_id = $2 AND a.status = 'concluido'`, [agendamentoId, req.usuario.id])
    if (!agendamento.rows.length) return res.status(403).json({ sucesso: false, erro: 'Apenas atendimentos concluídos da sua barbearia podem ser avaliados' })
    const resultado = await pool.query('INSERT INTO avaliacoes_clientes (barbeiro_id, cliente_id, agendamento_id, nota, comentario) VALUES ($1, $2, $3, $4, $5) RETURNING *', [req.usuario.id, agendamento.rows[0].cliente_id, agendamentoId, Number(nota), comentario?.trim() || null])
    res.status(201).json({ sucesso: true, dados: resultado.rows[0] })
  } catch (erro) {
    if (erro.code === '23505') return res.status(409).json({ sucesso: false, erro: 'Este cliente já foi avaliado neste atendimento' })
    console.error('Falha ao avaliar cliente:', erro)
    return res.status(500).json({ sucesso: false, erro: 'Não foi possível publicar a avaliação agora.' })
  }
})
module.exports = router
