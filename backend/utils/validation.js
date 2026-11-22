function positiveInteger(value) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function requiredId(value, field = 'identificador') {
  const parsed = positiveInteger(value)
  if (parsed) return parsed
  const error = new Error(`Informe um ${field} válido.`)
  error.status = 400
  throw error
}

module.exports = { positiveInteger, requiredId }
