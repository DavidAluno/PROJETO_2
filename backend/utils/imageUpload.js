const fs = require('fs/promises')
const path = require('path')
const { randomUUID } = require('crypto')

const SIGNATURES = [
  { extension: 'jpg', mime: 'image/jpeg', matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { extension: 'png', mime: 'image/png', matches: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { extension: 'webp', mime: 'image/webp', matches: (bytes) => bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP' }
]

async function removeUploadedFile(file) {
  if (!file?.path) return
  try { await fs.unlink(file.path) } catch (error) { if (error.code !== 'ENOENT') console.error('Falha ao remover upload temporário:', error.message) }
}

async function validateAndRenameImage(file, uploadDir) {
  const handle = await fs.open(file.path, 'r')
  let bytes
  try {
    bytes = Buffer.alloc(12)
    await handle.read(bytes, 0, bytes.length, 0)
  } finally {
    await handle.close()
  }

  const detected = SIGNATURES.find((signature) => signature.matches(bytes))
  if (!detected) {
    const error = new Error('Envie uma imagem JPG, PNG ou WebP válida.')
    error.status = 400
    throw error
  }

  const filename = `${randomUUID()}.${detected.extension}`
  const destination = path.join(uploadDir, filename)
  await fs.rename(file.path, destination)
  return { ...file, filename, path: destination, mimetype: detected.mime }
}

module.exports = { removeUploadedFile, validateAndRenameImage }
