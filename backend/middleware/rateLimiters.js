const rateLimit = require('express-rate-limit')

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { sucesso: false, erro: message }
  })
}

const loginLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 30, message: 'Muitas tentativas de login. Aguarde alguns minutos para tentar novamente.' })
const registerLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: 20, message: 'Muitos cadastros neste endereço. Tente novamente mais tarde.' })
const bookingLimiter = createLimiter({ windowMs: 10 * 60 * 1000, max: 30, message: 'Muitas solicitações de agendamento. Aguarde alguns minutos.' })

module.exports = { loginLimiter, registerLimiter, bookingLimiter }
