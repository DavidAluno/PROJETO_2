const nodemailer = require('nodemailer')

const configured = Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM)
let transporter

function getTransporter() {
  if (!configured) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      pool: true,
      maxConnections: 3
    })
  }
  return transporter
}

async function sendEmail({ to, name, subject, message }) {
  const client = getTransporter()
  if (!client || !to) return { sent: false, reason: 'not_configured' }
  const safeName = String(name || 'cliente').replace(/[<>]/g, '')
  const safeMessage = String(message || '').replace(/[<>]/g, '')
  try {
    await client.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: `BarberConnect — ${subject}`,
      text: `Olá, ${safeName}.\n\n${safeMessage}\n\nBarberConnect`,
      html: `<main style="font-family:Arial,sans-serif;line-height:1.55;color:#10110d"><h1 style="font-size:20px">BarberConnect</h1><p>Olá, ${safeName}.</p><p>${safeMessage}</p></main>`
    })
    return { sent: true }
  } catch (error) {
    console.error('Falha ao enviar e-mail transacional:', error.message)
    return { sent: false, reason: 'delivery_failed' }
  }
}

module.exports = { sendEmail, isEmailEnabled: () => configured }
