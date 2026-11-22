const fs = require('fs/promises')
const path = require('path')
const { v2: cloudinary } = require('cloudinary')

const usesCloudinary = Boolean(process.env.CLOUDINARY_URL)

if (usesCloudinary) cloudinary.config({ secure: true })

async function removeLocalFile(filePath) {
  if (!filePath) return
  try { await fs.unlink(filePath) } catch { /* arquivo já removido ou indisponível */ }
}

async function uploadPortfolioImage(file) {
  if (!usesCloudinary) {
    return { url: `/uploads/${file.filename}`, publicId: null, provider: 'local' }
  }

  try {
    const uploaded = await cloudinary.uploader.upload(file.path, {
      folder: 'barberconnect/portfolio',
      resource_type: 'image',
      transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }]
    })
    await removeLocalFile(file.path)
    return { url: uploaded.secure_url, publicId: uploaded.public_id, provider: 'cloudinary' }
  } catch (error) {
    await removeLocalFile(file.path)
    throw new Error('Não foi possível enviar a imagem para o armazenamento seguro.', { cause: error })
  }
}

async function removePortfolioImage({ imageUrl, publicId, uploadDir }) {
  if (usesCloudinary && publicId) {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true })
    return
  }
  if (imageUrl?.startsWith('/uploads/')) {
    await removeLocalFile(path.join(uploadDir, path.basename(imageUrl)))
  }
}

module.exports = { uploadPortfolioImage, removePortfolioImage, usesCloudinary }
