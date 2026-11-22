const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { removeUploadedFile, validateAndRenameImage } = require('../utils/imageUpload')

async function run() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'barberconnect-upload-'))
  try {
    const validPath = path.join(directory, 'valid.upload')
    await fs.writeFile(validPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]))
    const valid = await validateAndRenameImage({ path: validPath, filename: 'valid.upload' }, directory)
    assert.match(valid.filename, /^[\da-f-]+\.png$/)
    await fs.access(valid.path)

    const invalidPath = path.join(directory, 'invalid.upload')
    await fs.writeFile(invalidPath, '<script>alert(1)</script>')
    await assert.rejects(() => validateAndRenameImage({ path: invalidPath, filename: 'invalid.upload' }, directory), { status: 400 })
    await removeUploadedFile({ path: invalidPath })
    await assert.rejects(() => fs.access(invalidPath))
    console.log('UPLOAD VALIDATION OK: assinatura, extensão e limpeza verificadas.')
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
}

run().catch((error) => {
  console.error(`UPLOAD VALIDATION FAILED: ${error.message}`)
  process.exitCode = 1
})
