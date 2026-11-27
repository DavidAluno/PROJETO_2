const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const path = require('path')
const pool = require('./db')
const usuariosRoutes = require('./routes/usuarios')
const barbeariasRoutes = require('./routes/barbearias')
const agendamentosRoutes = require('./routes/agendamentos')
const avaliacoesRoutes = require('./routes/avaliacoes')
const portfolioRoutes = require('./routes/portfolio')
const avaliacoesClientesRoutes = require('./routes/avaliacoesClientes')
const servicosRoutes = require('./routes/servicos')
const agendaRoutes = require('./routes/agenda')
const favoritosRoutes = require('./routes/favoritos')
const notificacoesRoutes = require('./routes/notificacoes')
const adminRoutes = require('./routes/admin')
const { removeUploadedFile } = require('./utils/imageUpload')
const { expireStaleAppointments } = require('./utils/bookingLifecycle')

const app = express()
const PORT = process.env.PORT || 3001
const staticDir = process.env.STATIC_DIR ? path.resolve(process.env.STATIC_DIR) : null

app.set('trust proxy', 1)

app.use((_req, res, next) => {
  const sendJson = res.json.bind(res)
  res.json = (payload) => {
    if (payload?.sucesso === true || payload?.sucesso === false) return sendJson(payload)
    if (res.statusCode >= 400) return sendJson({ sucesso: false, erro: payload?.erro || 'Não foi possível concluir esta solicitação.' })
    return sendJson({ sucesso: true, dados: payload })
  }
  next()
})

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(',') : ['http://localhost:5173', 'http://127.0.0.1:5173'] }))
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff')
}))

app.get('/api/health', (_req, res) => {
  res.json({ mensagem: 'Servidor BarberConnect funcionando!' })
})

app.use('/usuarios', usuariosRoutes)
app.use('/barbearias', barbeariasRoutes)
app.use('/agendamentos', agendamentosRoutes)
app.use('/avaliacoes', avaliacoesRoutes)
app.use('/portfolio', portfolioRoutes)
app.use('/avaliacoes-clientes', avaliacoesClientesRoutes)
app.use('/servicos', servicosRoutes)
app.use('/agenda', agendaRoutes)
app.use('/favoritos', favoritosRoutes)
app.use('/notificacoes', notificacoesRoutes)
app.use('/admin', adminRoutes)

// Em hospedagem, frontend e API compartilham o mesmo domínio. Assim o usuário
// precisa somente abrir o link, sem instalar Node, VS Code ou PostgreSQL.
if (staticDir) {
  app.use(express.static(staticDir))
  app.get('/*splat', (_req, res) => res.sendFile(path.join(staticDir, 'index.html')))
} else {
  app.get('/', (_req, res) => res.json({ mensagem: 'Servidor BarberConnect funcionando!' }))
}

app.use((_req, res) => res.status(404).json({ sucesso: false, erro: 'Rota não encontrada.' }))

app.use(async (erro, req, res, _next) => {
  if (req.file) await removeUploadedFile(req.file).catch(() => {})
  if (erro?.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ sucesso: false, erro: 'A imagem deve ter no máximo 5 MB.' })
  if (erro?.name === 'MulterError') return res.status(400).json({ sucesso: false, erro: 'Não foi possível enviar essa imagem.' })
  if (erro) {
    console.error(erro)
    return res.status(500).json({ sucesso: false, erro: 'Ocorreu um erro inesperado. Tente novamente.' })
  }
  return res.status(500).json({ sucesso: false, erro: 'Ocorreu um erro inesperado. Tente novamente.' })
})

function startServer() {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`)
  })

  void expireStaleAppointments(pool).catch((error) => console.error('Falha ao expirar agendamentos:', error))
  const expirationTimer = setInterval(() => {
    void expireStaleAppointments(pool).catch((error) => console.error('Falha ao expirar agendamentos:', error))
  }, 60 * 1000)
  expirationTimer.unref()
}

if (require.main === module) startServer()

module.exports = app
