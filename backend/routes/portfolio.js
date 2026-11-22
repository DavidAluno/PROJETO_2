const express = require('express')
const router = express.Router()
const pool = require('../db')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { randomUUID } = require('crypto')
const { auth, tipo } = require('../middleware/auth')
const { uploadPortfolioImage, removePortfolioImage } = require('../utils/mediaStorage')
const { removeUploadedFile, validateAndRenameImage } = require('../utils/imageUpload')
const { requiredId } = require('../utils/validation')

const uploadDir = path.join(__dirname, '..', 'uploads')
fs.mkdirSync(uploadDir, { recursive: true })
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, _file, done) => done(null, `${randomUUID()}.upload`)
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

function validateMetadata(titulo, descricao) {
  if (typeof titulo !== 'string' || !titulo.trim()) return 'Informe um título para a imagem.'
  if (titulo.trim().length > 100 || (descricao !== undefined && (typeof descricao !== 'string' || descricao.trim().length > 400))) return 'Use até 100 caracteres no título e 400 na descrição.'
  return null
}

router.get('/barbearia/:id', async (req, res) => {
  try {
    const barbeariaId = requiredId(req.params.id, 'ID de barbearia')
    const resultado = await pool.query('SELECT * FROM portfolio WHERE barbearia_id = $1 ORDER BY criado_em DESC', [barbeariaId])
    return res.json(resultado.rows)
  } catch (error) {
    if (error.status) return res.status(error.status).json({ sucesso: false, erro: error.message })
    console.error('Falha ao carregar portfólio:', error)
    return res.status(500).json({ erro: 'Não foi possível carregar o portfólio agora.' })
  }
})

router.post('/', auth, tipo('barbeiro'), upload.single('imagem'), async (req, res) => {
  let localFile = req.file
  let storedMedia = null
  try {
    const metadataError = validateMetadata(req.body.titulo, req.body.descricao)
    if (metadataError || !localFile) {
      const error = new Error(metadataError || 'Envie uma imagem JPG, PNG ou WebP de até 5 MB.')
      error.status = 400
      throw error
    }

    localFile = await validateAndRenameImage(localFile, uploadDir)
    const barbearia = await pool.query('SELECT id FROM barbearias WHERE usuario_id = $1', [req.usuario.id])
    if (!barbearia.rows.length) {
      const error = new Error('Cadastre sua barbearia antes de publicar no portfólio.')
      error.status = 404
      throw error
    }

    storedMedia = await uploadPortfolioImage(localFile)
    const resultado = await pool.query(
      'INSERT INTO portfolio (barbearia_id, titulo, descricao, imagem_url, media_public_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [barbearia.rows[0].id, req.body.titulo.trim(), req.body.descricao?.trim() || null, storedMedia.url, storedMedia.publicId]
    )
    return res.status(201).json(resultado.rows[0])
  } catch (error) {
    if (storedMedia) {
      await removePortfolioImage({ imageUrl: storedMedia.url, publicId: storedMedia.publicId, uploadDir }).catch((cleanupError) => console.error('Falha ao desfazer upload:', cleanupError.message))
    } else {
      await removeUploadedFile(localFile)
    }
    if (error.status) return res.status(error.status).json({ erro: error.message })
    console.error('Falha ao salvar imagem do portfólio:', error)
    return res.status(500).json({ erro: 'Não foi possível salvar a imagem agora.' })
  }
})

router.patch('/:id', auth, tipo('barbeiro'), async (req, res) => {
  const metadataError = validateMetadata(req.body.titulo, req.body.descricao)
  if (metadataError) return res.status(400).json({ erro: metadataError })
  try {
    const portfolioId = requiredId(req.params.id, 'ID de imagem')
    const resultado = await pool.query(
      `UPDATE portfolio p SET titulo = $1, descricao = $2
       FROM barbearias b WHERE p.id = $3 AND p.barbearia_id = b.id AND b.usuario_id = $4 RETURNING p.*`,
       [req.body.titulo.trim(), req.body.descricao?.trim() || null, portfolioId, req.usuario.id]
    )
    if (!resultado.rows.length) return res.status(404).json({ erro: 'Imagem não encontrada.' })
    return res.json(resultado.rows[0])
  } catch (error) {
    if (error.status) return res.status(error.status).json({ sucesso: false, erro: error.message })
    console.error('Falha ao atualizar portfólio:', error)
    return res.status(500).json({ erro: 'Não foi possível atualizar a imagem.' })
  }
})

router.delete('/:id', auth, tipo('barbeiro'), async (req, res) => {
  try {
    const portfolioId = requiredId(req.params.id, 'ID de imagem')
    const resultado = await pool.query(
      `DELETE FROM portfolio p USING barbearias b
       WHERE p.id = $1 AND p.barbearia_id = b.id AND b.usuario_id = $2
       RETURNING p.imagem_url, p.media_public_id`,
       [portfolioId, req.usuario.id]
    )
    if (!resultado.rows.length) return res.status(404).json({ erro: 'Imagem não encontrada.' })
    await removePortfolioImage({ imageUrl: resultado.rows[0].imagem_url, publicId: resultado.rows[0].media_public_id, uploadDir })
    return res.json({ sucesso: true })
  } catch (error) {
    if (error.status) return res.status(error.status).json({ sucesso: false, erro: error.message })
    console.error('Falha ao remover portfólio:', error)
    return res.status(500).json({ erro: 'Não foi possível remover a imagem.' })
  }
})

module.exports = router
