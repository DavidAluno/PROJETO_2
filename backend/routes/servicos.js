const express = require('express')
const router = express.Router()
const pool = require('../db')
const { auth, tipo } = require('../middleware/auth')
const { requiredId } = require('../utils/validation')

async function getOwnedShop(userId) {
  const result = await pool.query('SELECT id FROM barbearias WHERE usuario_id = $1', [userId])
  return result.rows[0]
}

function validateService({ nome, preco, duracao_minutos }) {
  if (!nome?.trim() || nome.trim().length > 100) return 'Informe um nome de serviço com até 100 caracteres'
  if (!Number.isFinite(Number(preco)) || Number(preco) < 0) return 'Informe um preço válido'
  if (!Number.isInteger(Number(duracao_minutos)) || Number(duracao_minutos) < 10 || Number(duracao_minutos) > 360) return 'A duração deve ficar entre 10 e 360 minutos'
  return null
}

router.get('/barbearia/:barbeariaId', async (req, res) => {
  try {
    const barbeariaId = requiredId(req.params.barbeariaId, 'ID de barbearia')
    const result = await pool.query(
      'SELECT id, nome, preco, duracao_minutos, ativo FROM servicos WHERE barbearia_id = $1 AND ativo = TRUE ORDER BY preco, nome',
      [barbeariaId]
    )
    res.json({ sucesso: true, dados: result.rows })
  } catch (error) { res.status(error.status || 500).json({ sucesso: false, erro: error.status ? error.message : 'Não foi possível carregar os serviços agora' }) }
})

router.get('/meus', auth, tipo('barbeiro'), async (req, res) => {
  try {
    const shop = await getOwnedShop(req.usuario.id)
    if (!shop) return res.status(404).json({ sucesso: false, erro: 'Cadastre sua barbearia antes de gerenciar serviços' })
    const result = await pool.query('SELECT * FROM servicos WHERE barbearia_id = $1 ORDER BY ativo DESC, preco, nome', [shop.id])
    res.json({ sucesso: true, dados: result.rows })
  } catch { res.status(500).json({ sucesso: false, erro: 'Não foi possível carregar seus serviços' }) }
})

router.post('/', auth, tipo('barbeiro'), async (req, res) => {
  const error = validateService(req.body)
  if (error) return res.status(400).json({ sucesso: false, erro: error })
  try {
    const shop = await getOwnedShop(req.usuario.id)
    if (!shop) return res.status(404).json({ sucesso: false, erro: 'Cadastre sua barbearia antes de adicionar serviços' })
    const { nome, preco, duracao_minutos } = req.body
    const result = await pool.query(
      'INSERT INTO servicos (barbearia_id, nome, preco, duracao_minutos) VALUES ($1, $2, $3, $4) RETURNING *',
      [shop.id, nome.trim(), Number(preco), Number(duracao_minutos)]
    )
    res.status(201).json({ sucesso: true, dados: result.rows[0] })
  } catch { res.status(500).json({ sucesso: false, erro: 'Não foi possível criar o serviço' }) }
})

router.patch('/:id', auth, tipo('barbeiro'), async (req, res) => {
  const error = validateService(req.body)
  if (error) return res.status(400).json({ sucesso: false, erro: error })
  try {
    const serviceId = requiredId(req.params.id, 'ID de serviço')
    const { nome, preco, duracao_minutos, ativo = true } = req.body
    const result = await pool.query(
      `UPDATE servicos s SET nome = $1, preco = $2, duracao_minutos = $3, ativo = $4
       FROM barbearias b WHERE s.id = $5 AND s.barbearia_id = b.id AND b.usuario_id = $6 RETURNING s.*`,
       [nome.trim(), Number(preco), Number(duracao_minutos), ativo === true, serviceId, req.usuario.id]
    )
    if (!result.rows.length) return res.status(404).json({ sucesso: false, erro: 'Serviço não encontrado' })
    res.json({ sucesso: true, dados: result.rows[0] })
  } catch (error) { res.status(error.status || 500).json({ sucesso: false, erro: error.status ? error.message : 'Não foi possível atualizar o serviço' }) }
})

router.delete('/:id', auth, tipo('barbeiro'), async (req, res) => {
  try {
    const serviceId = requiredId(req.params.id, 'ID de serviço')
    const result = await pool.query(
      `DELETE FROM servicos s USING barbearias b
       WHERE s.id = $1 AND s.barbearia_id = b.id AND b.usuario_id = $2 RETURNING s.id`,
       [serviceId, req.usuario.id]
    )
    if (!result.rows.length) return res.status(404).json({ sucesso: false, erro: 'Serviço não encontrado' })
    res.json({ sucesso: true, dados: { id: serviceId } })
  } catch (error) {
    if (error.status) return res.status(error.status).json({ sucesso: false, erro: error.message })
    if (error.code === '23503') return res.status(409).json({ sucesso: false, erro: 'Este serviço possui agendamentos e não pode ser removido. Desative-o.' })
    res.status(500).json({ sucesso: false, erro: 'Não foi possível remover o serviço' })
  }
})

module.exports = router
