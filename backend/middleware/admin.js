const pool = require('../db')

function configuredAdminEmails() {
  return new Set(
    String(process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  )
}

function isConfiguredAdmin(email) {
  return configuredAdminEmails().has(String(email || '').trim().toLowerCase())
}

async function adminOnly(req, res, next) {
  try {
    const result = await pool.query('SELECT email FROM usuarios WHERE id = $1', [req.usuario?.id])
    const user = result.rows[0]
    if (!user || !isConfiguredAdmin(user.email)) {
      return res.status(403).json({ erro: 'Esta área é restrita ao administrador configurado.' })
    }
    req.usuario.admin = true
    return next()
  } catch (error) {
    console.error('Falha ao validar administrador:', error)
    return res.status(500).json({ erro: 'Não foi possível validar suas permissões agora.' })
  }
}

module.exports = { adminOnly, isConfiguredAdmin }
