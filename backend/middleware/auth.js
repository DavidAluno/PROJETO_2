const jwt = require('jsonwebtoken')
const pool = require('../db')
const { isConfiguredAdmin } = require('./admin')
function auth(req, res, next) {
  const authorization = req.headers.authorization
  const match = /^Bearer\s+([^\s]+)$/.exec(authorization || '')
  if (!match) return res.status(401).json({ erro: 'Faça login com um token Bearer válido para continuar' })
  try { req.usuario = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] }); next() }
  catch { return res.status(401).json({ erro: 'Sessão inválida ou expirada' }) }
}
const tipo = (...tipos) => async (req, res, next) => {
  try {
    // O tipo do token não é a fonte de verdade: ele pode ter sido alterado
    // depois que a sessão foi criada. Revalidamos antes das rotas por perfil.
    const result = await pool.query('SELECT tipo, email FROM usuarios WHERE id = $1', [req.usuario?.id])
    const usuario = result.rows[0]
    if (!usuario) return res.status(401).json({ erro: 'Sessão inválida ou expirada' })
    req.usuario.tipo = usuario.tipo
    req.usuario.admin = isConfiguredAdmin(usuario.email)
    return tipos.includes(usuario.tipo)
      ? next()
      : res.status(403).json({ erro: 'Sem permissão para esta ação' })
  } catch (error) {
    console.error('Falha ao validar o perfil da sessão:', error)
    return res.status(500).json({ sucesso: false, erro: 'Não foi possível validar sua sessão agora.' })
  }
}
module.exports = { auth, tipo }
