export function haversineKm(from, to) {
  const [fromLat, fromLon] = from.map(Number)
  const toLat = Number(to.latitude ?? to.lat)
  const toLon = Number(to.longitude ?? to.lng ?? to.lon)
  if (![fromLat, fromLon, toLat, toLon].every(Number.isFinite)) return null
  const radians = (value) => value * Math.PI / 180
  const earthRadius = 6371
  const deltaLat = radians(toLat - fromLat)
  const deltaLon = radians(toLon - fromLon)
  const formula = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(deltaLon / 2) ** 2
  return 2 * earthRadius * Math.atan2(Math.sqrt(formula), Math.sqrt(1 - formula))
}

export function formatDistance(kilometers) {
  if (!Number.isFinite(kilometers)) return 'Distância indisponível'
  return kilometers < 1 ? `${Math.max(1, Math.round(kilometers * 1000))} m` : `${kilometers.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`
}
