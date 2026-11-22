const express = require('express')
const router = express.Router()
const pool = require('../db')
const { auth, tipo } = require('../middleware/auth')
const { requiredId } = require('../utils/validation')

router.get('/', auth, tipo('cliente'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, f.criado_em AS favoritado_em, COALESCE(ROUND(AVG(a.nota)::numeric, 1), 0) AS media_avaliacoes,
        COUNT(a.id)::int AS total_avaliacoes
       FROM favoritos f JOIN barbearias b ON b.id = f.barbearia_id
       LEFT JOIN avaliacoes a ON a.barbearia_id = b.id
       WHERE f.cliente_id = $1 GROUP BY b.id, f.criado_em ORDER BY f.criado_em DESC`,
      [req.usuario.id]
    )
    res.json({ sucesso: true, dados: result.rows })
  } catch { res.status(500).json({ sucesso: false, erro: 'Não foi possível carregar seus favoritos' }) }
})

router.get('/status/:barbeariaId', auth, tipo('cliente'), async (req, res) => {
  try {
    const barbeariaId = requiredId(req.params.barbeariaId, 'ID de barbearia')
    const result = await pool.query('SELECT 1 FROM favoritos WHERE cliente_id = $1 AND barbearia_id = $2', [req.usuario.id, barbeariaId])
    res.json({ sucesso: true, dados: { favorito: Boolean(result.rows.length) } })
  } catch (error) { res.status(error.status || 500).json({ sucesso: false, erro: error.status ? error.message : 'Não foi possível consultar o favorito' }) }
})

router.post('/:barbeariaId', auth, tipo('cliente'), async (req, res) => {
  try {
    const barbeariaId = requiredId(req.params.barbeariaId, 'ID de barbearia')
    const shop = await pool.query('SELECT id FROM barbearias WHERE id = $1', [barbeariaId])
    if (!shop.rows.length) return res.status(404).json({ sucesso: false, erro: 'Barbearia não encontrada' })
    await pool.query('INSERT INTO favoritos (cliente_id, barbearia_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.usuario.id, barbeariaId])
    res.status(201).json({ sucesso: true, dados: { favorito: true } })
  } catch (error) { res.status(error.status || 500).json({ sucesso: false, erro: error.status ? error.message : 'Não foi possível favoritar esta barbearia' }) }
})

router.delete('/:barbeariaId', auth, tipo('cliente'), async (req, res) => {
  try {
    const barbeariaId = requiredId(req.params.barbeariaId, 'ID de barbearia')
    await pool.query('DELETE FROM favoritos WHERE cliente_id = $1 AND barbearia_id = $2', [req.usuario.id, barbeariaId])
    res.json({ sucesso: true, dados: { favorito: false } })
  } catch (error) { res.status(error.status || 500).json({ sucesso: false, erro: error.status ? error.message : 'Não foi possível remover o favorito' }) }
})

module.exports = router
