export const parseMapCoordinates = (value = '') => {
  const raw = String(value).trim()
  let text = raw
  try {
    text = decodeURIComponent(raw)
  } catch {}
  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/,
    /(?:q|query|ll|center|sll|destination|daddr|origin)=loc:(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /(?:q|query|ll|center|sll|destination|daddr|origin)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /(?:q|query)=(-?\d+(?:\.\d+)?)%2C(-?\d+(?:\.\d+)?)/i,
    /(?:^|[^\d.-])(-?\d{1,2}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})(?:[^\d.-]|$)/,
    /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const first = Number(match[1])
      const second = Number(match[2])
      const lat = pattern.source.startsWith('!2d') ? second : first
      const lng = pattern.source.startsWith('!2d') ? first : second
      if (Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180) return { lat, lng }
    }
  }
  try {
    const url = new URL(raw)
    const params = url.searchParams
    for (const key of ['q', 'query', 'll', 'center', 'sll', 'destination', 'daddr', 'origin']) {
      const coords = params.get(key)
      if (!coords) continue
      const parsed = parseMapCoordinates(coords.replace(/^loc:/i, ''))
      if (parsed) return parsed
    }
  } catch {}
  return null
}

export const marketDirectionsUrl = (market) => {
  if (market?.mapUrl) return market.mapUrl
  if (Number.isFinite(Number(market?.lat)) && Number.isFinite(Number(market?.lng))) {
    return `https://www.google.com/maps?q=${market.lat},${market.lng}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(market?.address || market?.name || 'market')}`
}

export const marketEmbedUrl = (market, zoom = 13) => {
  if (Number.isFinite(Number(market?.lat)) && Number.isFinite(Number(market?.lng))) {
    return `https://www.google.com/maps?q=${market.lat},${market.lng}&z=${zoom}&output=embed`
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(market?.address || market?.name || 'market')}&z=${zoom}&output=embed`
}
