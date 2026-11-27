const express = require('express')
const pool = require('../db')
const { auth } = require('../middleware/auth')
const { adminOnly } = require('../middleware/admin')
const { requiredId } = require('../utils/validation')

const router = express.Router()
const testShopPattern = '^Barbearia E2E [0-9]+$'

router.use(auth, adminOnly)

router.get('/barbearias', async (req, res) => {
  const search = String(req.query.busca || '').trim()
  try {
    const result = await pool.query(
      `SELECT b.id, b.nome, b.endereco, b.criado_em, b.disponivel,
        u.nome AS nome_barbeiro, u.email AS email_barbeiro,
        COUNT(DISTINCT a.id)::int AS total_agendamentos
       FROM barbearias b
       JOIN usuarios u ON u.id = b.usuario_id
       LEFT JOIN agendamentos a ON a.barbearia_id = b.id
       WHERE ($1 = '' OR b.nome ILIKE '%' || $1 || '%' OR u.nome ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
       GROUP BY b.id, u.nome, u.email
       ORDER BY b.criado_em DESC`,
      [search]
    )
    return res.json({ itens: result.rows, total: result.rows.length })
  } catch (error) {
    console.error('Falha ao listar barbearias para administração:', error)
    return res.status(500).json({ erro: 'Não foi possível carregar as barbearias agora.' })
  }
})

router.delete('/barbearias/:id', async (req, res) => {
  let client
  try {
    const id = requiredId(req.params.id, 'ID de barbearia')
    client = await pool.connect()
    await client.query('BEGIN')
    const found = await client.query('SELECT id, nome FROM barbearias WHERE id = $1 FOR UPDATE', [id])
    if (!found.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ erro: 'Barbearia não encontrada.' })
    }
    await client.query('DELETE FROM agendamentos WHERE barbearia_id = $1', [id])
    const result = await client.query('DELETE FROM barbearias WHERE id = $1 RETURNING id, nome', [id])
    await client.query('COMMIT')
    return res.json({ mensagem: `Barbearia “${result.rows[0].nome}” removida.` })
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {})
    if (error.status) return res.status(error.status).json({ erro: error.message })
    console.error('Falha ao remover barbearia:', error)
    return res.status(500).json({ erro: 'Não foi possível remover a barbearia agora.' })
  } finally { client?.release() }
})

router.post('/limpar-dados-teste', async (_req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `DELETE FROM agendamentos a
       USING barbearias b, usuarios u
       WHERE a.barbearia_id = b.id AND b.usuario_id = u.id
         AND (b.nome ~* $1 OR u.email ILIKE '%@example.test')`,
      [testShopPattern]
    )
    const shops = await client.query(
      `DELETE FROM barbearias b
       USING usuarios u
       WHERE b.usuario_id = u.id
         AND (b.nome ~* $1 OR u.email ILIKE '%@example.test')
       RETURNING b.id`,
      [testShopPattern]
    )
    const users = await client.query(
      `DELETE FROM usuarios u
       WHERE u.email ILIKE '%@example.test'
         AND NOT EXISTS (SELECT 1 FROM barbearias b WHERE b.usuario_id = u.id)
       RETURNING u.id`
    )
    await client.query('COMMIT')
    return res.json({ mensagem: 'Dados de teste removidos.', barbearias_removidas: shops.rowCount, usuarios_removidos: users.rowCount })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Falha ao limpar dados de teste:', error)
    return res.status(500).json({ erro: 'Não foi possível limpar os dados de teste agora.' })
  } finally {
    client.release()
  }
})

module.exports = router
