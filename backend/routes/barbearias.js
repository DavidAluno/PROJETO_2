const express = require('express')
const router = express.Router()
const pool = require('../db')
const { auth, tipo } = require('../middleware/auth')
const { geocodeBrazilianAddress, validCoordinates } = require('../utils/geocode')
const { requiredId } = require('../utils/validation')

function normalizeShopPayload(body) {
  const nome = String(body.nome || '').trim()
  const descricao = String(body.descricao || '').trim()
  const especialidades = String(body.especialidades || '').trim()
  const endereco = String(body.endereco || '').trim()
  const hasLatitude = body.latitude !== undefined && body.latitude !== null && body.latitude !== ''
  const hasLongitude = body.longitude !== undefined && body.longitude !== null && body.longitude !== ''
  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)

  if (nome.length < 3 || nome.length > 140 || endereco.length < 8 || endereco.length > 300) {
    const error = new Error('Informe nome e endereço completos da barbearia.')
    error.status = 400
    throw error
  }
  if (descricao.length > 600 || especialidades.length > 300) {
    const error = new Error('Descrição ou especialidades ultrapassam o tamanho permitido.')
    error.status = 400
    throw error
  }
  if (hasLatitude !== hasLongitude || ((hasLatitude || hasLongitude) && !validCoordinates(latitude, longitude))) {
    const error = new Error('As coordenadas informadas são inválidas.')
    error.status = 400
    throw error
  }
  return { nome, descricao: descricao || null, especialidades: especialidades || null, endereco, coordinates: hasLatitude ? { latitude, longitude } : null }
}

async function resolveCoordinates(payload) {
  return payload.coordinates || geocodeBrazilianAddress(payload.endereco)
}

router.get('/', async (req, res) => {
  const { busca = '', servico = '', avaliacao_minima, disponivel } = req.query
  const rating = Number(avaliacao_minima || 0)
  try {
    const resultado = await pool.query(
      `SELECT b.*, u.nome AS nome_barbeiro,
        COALESCE((SELECT ROUND(AVG(av.nota)::numeric, 1) FROM avaliacoes av WHERE av.barbearia_id = b.id), 0) AS media_avaliacoes,
        (SELECT COUNT(*)::int FROM avaliacoes av WHERE av.barbearia_id = b.id) AS total_avaliacoes,
        (SELECT MIN(s.preco) FROM servicos s WHERE s.barbearia_id = b.id AND s.ativo = TRUE) AS preco_inicial,
        ARRAY(SELECT s.nome FROM servicos s WHERE s.barbearia_id = b.id AND s.ativo = TRUE ORDER BY s.preco, s.nome) AS servicos
       FROM barbearias b JOIN usuarios u ON b.usuario_id = u.id
       WHERE ($1 = '' OR b.nome ILIKE '%' || $1 || '%' OR b.endereco ILIKE '%' || $1 || '%' OR COALESCE(b.especialidades, '') ILIKE '%' || $1 || '%' OR EXISTS (
         SELECT 1 FROM servicos pesquisa WHERE pesquisa.barbearia_id = b.id AND pesquisa.ativo = TRUE AND pesquisa.nome ILIKE '%' || $1 || '%'
       ))
         AND ($2 = '' OR EXISTS (SELECT 1 FROM servicos filtro WHERE filtro.barbearia_id = b.id AND filtro.ativo = TRUE AND filtro.nome ILIKE '%' || $2 || '%'))
         AND ($3::boolean IS NULL OR b.disponivel = $3::boolean)
         AND COALESCE((SELECT ROUND(AVG(av.nota)::numeric, 1) FROM avaliacoes av WHERE av.barbearia_id = b.id), 0) >= $4
       ORDER BY b.criado_em DESC`
      , [String(busca).trim(), String(servico).trim(), disponivel === undefined ? null : disponivel === 'true', Number.isFinite(rating) ? rating : 0]
    )
    res.json(resultado.rows)
  } catch (erro) {
    console.error('Falha ao listar barbearias:', erro)
    res.status(500).json({ sucesso: false, erro: 'Não foi possível carregar as barbearias agora.' })
  }
})

// Ranking explicável: combina os serviços já concluídos pelo cliente,
// avaliação pública e disponibilidade. Não envia histórico a serviços externos.
router.get('/recomendadas/para-mim', auth, tipo('cliente'), async (req, res) => {
  try {
    const resultado = await pool.query(
      `WITH preferencias AS (
        SELECT DISTINCT s.nome
        FROM agendamentos a
        JOIN servicos s ON s.id = a.servico_id
        WHERE a.cliente_id = $1 AND a.status = 'concluido'
      )
      SELECT b.*, u.nome AS nome_barbeiro,
        COALESCE(ROUND(AVG(av.nota)::numeric, 1), 0) AS media_avaliacoes,
        COUNT(DISTINCT av.id)::int AS total_avaliacoes,
        MIN(s.preco) FILTER (WHERE s.ativo = TRUE) AS preco_inicial,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT s.nome) FILTER (WHERE s.ativo = TRUE), NULL) AS servicos,
        COUNT(DISTINCT p.nome)::int AS servicos_compativeis
      FROM barbearias b
      JOIN usuarios u ON u.id = b.usuario_id
      LEFT JOIN servicos s ON s.barbearia_id = b.id
      LEFT JOIN preferencias p ON LOWER(p.nome) = LOWER(s.nome)
      LEFT JOIN avaliacoes av ON av.barbearia_id = b.id
      GROUP BY b.id, u.nome
      ORDER BY COUNT(DISTINCT p.nome) DESC, b.disponivel DESC,
        COALESCE(AVG(av.nota), 0) DESC, COUNT(DISTINCT av.id) DESC
      LIMIT 8`,
      [req.usuario.id]
    )
    return res.json({ sucesso: true, dados: resultado.rows })
  } catch (erro) {
    console.error('Falha ao gerar recomendações:', erro)
    return res.status(500).json({ sucesso: false, erro: 'Não foi possível gerar recomendações agora.' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const barbeariaId = requiredId(req.params.id, 'ID de barbearia')
    const shopResult = await pool.query(
      `SELECT b.*, u.nome AS nome_barbeiro,
        COALESCE(ROUND(AVG(a.nota)::numeric, 1), 0) AS media_avaliacoes,
        COUNT(DISTINCT a.id)::int AS total_avaliacoes
       FROM barbearias b JOIN usuarios u ON u.id = b.usuario_id
       LEFT JOIN avaliacoes a ON a.barbearia_id = b.id
       WHERE b.id = $1 GROUP BY b.id, u.nome`, [barbeariaId]
    )
    if (!shopResult.rows.length) return res.status(404).json({ sucesso: false, erro: 'Barbearia não encontrada' })
    const shop = shopResult.rows[0]
    const [services, hours, portfolio, reviews, distribution] = await Promise.all([
      pool.query('SELECT id, nome, preco, duracao_minutos FROM servicos WHERE barbearia_id = $1 AND ativo = TRUE ORDER BY preco, nome', [shop.id]),
      pool.query('SELECT dia_semana, inicio, fim FROM horarios_funcionamento WHERE barbearia_id = $1 ORDER BY dia_semana, inicio', [shop.id]),
      pool.query('SELECT * FROM portfolio WHERE barbearia_id = $1 ORDER BY criado_em DESC', [shop.id]),
      pool.query(`SELECT a.*, u.nome AS nome_cliente FROM avaliacoes a JOIN usuarios u ON u.id = a.cliente_id WHERE a.barbearia_id = $1 ORDER BY a.criado_em DESC LIMIT 12`, [shop.id]),
      pool.query(`SELECT nota, COUNT(*)::int AS quantidade FROM avaliacoes WHERE barbearia_id = $1 GROUP BY nota ORDER BY nota DESC`, [shop.id])
    ])
    res.json({ sucesso: true, dados: { ...shop, servicos: services.rows, horarios: hours.rows, portfolio: portfolio.rows, avaliacoes: reviews.rows, distribuicao_avaliacoes: distribution.rows } })
  } catch (error) { res.status(error.status || 500).json({ sucesso: false, erro: error.status ? error.message : 'Não foi possível carregar o perfil desta barbearia' }) }
})

router.post('/cadastrar', auth, tipo('barbeiro'), async (req, res) => {
  try {
    const payload = normalizeShopPayload(req.body)
    const coordinates = await resolveCoordinates(payload)
    const resultado = await pool.query(
      `INSERT INTO barbearias
       (usuario_id, nome, descricao, especialidades, endereco, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.usuario.id, payload.nome, payload.descricao, payload.especialidades, payload.endereco, coordinates.latitude, coordinates.longitude]
    )
    res.status(201).json(resultado.rows[0])
  } catch (erro) {
    if (erro.code === '23505') return res.status(409).json({ erro: 'Você já possui uma barbearia cadastrada.' })
    if (erro.status) return res.status(erro.status).json({ erro: erro.message })
    console.error('Falha ao cadastrar barbearia:', erro)
    res.status(500).json({ erro: 'Não foi possível cadastrar a barbearia agora.' })
  }
})

router.put('/:id', auth, tipo('barbeiro'), async (req, res) => {
  try {
    const barbeariaId = requiredId(req.params.id, 'ID de barbearia')
    const payload = normalizeShopPayload(req.body)
    const coordinates = await resolveCoordinates(payload)
    const resultado = await pool.query(
      `UPDATE barbearias
       SET nome = $1, descricao = $2, especialidades = $3, endereco = $4, latitude = $5, longitude = $6
       WHERE id = $7 AND usuario_id = $8 RETURNING *`,
       [payload.nome, payload.descricao, payload.especialidades, payload.endereco, coordinates.latitude, coordinates.longitude, barbeariaId, req.usuario.id]
    )
    if (!resultado.rows.length) return res.status(404).json({ erro: 'Barbearia não encontrada.' })
    return res.json(resultado.rows[0])
  } catch (erro) {
    if (erro.status) return res.status(erro.status).json({ erro: erro.message })
    console.error('Falha ao atualizar barbearia:', erro)
    return res.status(500).json({ erro: 'Não foi possível atualizar a barbearia agora.' })
  }
})

router.patch('/:id/disponibilidade', auth, tipo('barbeiro'), async (req, res) => {
  const { id } = req.params
  const { disponivel } = req.body

  if (typeof disponivel !== 'boolean') {
    return res.status(400).json({ erro: 'Disponibilidade inválida' })
  }

  try {
    const barbeariaId = requiredId(id, 'ID de barbearia')
    const resultado = await pool.query(
      'UPDATE barbearias SET disponivel = $1 WHERE id = $2 AND usuario_id = $3 RETURNING *',
      [disponivel, barbeariaId, req.usuario.id]
    )

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Barbearia não encontrada' })
    }

    res.json(resultado.rows[0])
  } catch (erro) {
    if (erro.status) return res.status(erro.status).json({ erro: erro.message })
    console.error('Falha ao atualizar disponibilidade:', erro)
    res.status(500).json({ sucesso: false, erro: 'Não foi possível atualizar a disponibilidade agora.' })
  }
})

module.exports = router
