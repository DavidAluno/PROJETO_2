function validCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
}

async function geocodeBrazilianAddress(address) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.search = new URLSearchParams({ format: 'jsonv2', limit: '1', countrycodes: 'br', q: address }).toString()
  let response
  try {
    response = await fetch(url, { headers: { 'User-Agent': 'BarberConnect-TCC/1.0 (geocoding)' }, signal: AbortSignal.timeout(8000) })
  } catch {
    const error = new Error('Não foi possível localizar este endereço agora. Tente novamente ou use sua localização atual.')
    error.status = 502
    throw error
  }
  if (!response.ok) {
    const error = new Error('Não foi possível localizar este endereço agora. Tente novamente ou use sua localização atual.')
    error.status = 502
    throw error
  }
  const results = await response.json()
  const latitude = Number(results[0]?.lat)
  const longitude = Number(results[0]?.lon)
  if (!validCoordinates(latitude, longitude)) {
    const error = new Error('Não encontramos esse endereço. Informe rua, número, bairro e cidade ou use sua localização atual.')
    error.status = 400
    throw error
  }
  return { latitude, longitude }
}

module.exports = { geocodeBrazilianAddress, validCoordinates }
