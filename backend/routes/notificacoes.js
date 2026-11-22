const express = require('express')
const router = express.Router()
const pool = require('../db')
const { auth } = require('../middleware/auth')
const { requiredId } = require('../utils/validation')

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notificacoes WHERE usuario_id = $1 ORDER BY criado_em DESC LIMIT 50', [req.usuario.id])
    res.json({ sucesso: true, dados: result.rows })
  } catch { res.status(500).json({ sucesso: false, erro: 'Não foi possível carregar as notificações' }) }
})

router.patch('/:id/lida', auth, async (req, res) => {
  try {
    const notificationId = requiredId(req.params.id, 'ID de notificação')
    const result = await pool.query('UPDATE notificacoes SET lida = TRUE WHERE id = $1 AND usuario_id = $2 RETURNING *', [notificationId, req.usuario.id])
    if (!result.rows.length) return res.status(404).json({ sucesso: false, erro: 'Notificação não encontrada' })
    res.json({ sucesso: true, dados: result.rows[0] })
  } catch (error) { res.status(error.status || 500).json({ sucesso: false, erro: error.status ? error.message : 'Não foi possível atualizar a notificação' }) }
})

router.patch('/ler/todas', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notificacoes SET lida = TRUE WHERE usuario_id = $1', [req.usuario.id])
    res.json({ sucesso: true, dados: { lidas: true } })
  } catch { res.status(500).json({ sucesso: false, erro: 'Não foi possível atualizar as notificações' }) }
})

module.exports = router
