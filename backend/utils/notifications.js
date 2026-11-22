const pool = require('../db')
const { sendEmail } = require('./mailer')

async function createNotification(db, usuarioId, tipo, titulo, mensagem) {
  const result = await db.query(
    'INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem) VALUES ($1, $2, $3, $4) RETURNING *',
    [usuarioId, tipo, titulo, mensagem]
  )
  return result.rows[0]
}

async function deliverNotificationEmail(notificationId) {
  const result = await pool.query(
    `SELECT n.titulo, n.mensagem, u.email, u.nome
     FROM notificacoes n JOIN usuarios u ON u.id = n.usuario_id
     WHERE n.id = $1`,
    [notificationId]
  )
  if (!result.rows.length) return
  const notification = result.rows[0]
  await sendEmail({ to: notification.email, name: notification.nome, subject: notification.titulo, message: notification.mensagem })
}

module.exports = { createNotification, deliverNotificationEmail }
