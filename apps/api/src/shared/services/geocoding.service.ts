interface ViaCepResponse {
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
  erro?: boolean
}

interface NominatimResult {
  lat: string
  lon: string
}

export interface GeocodeResult {
  latitude: number
  longitude: number
}

/**
 * CEP -> endereço (ViaCEP) -> coordenadas (Nominatim/OpenStreetMap), ambos gratuitos.
 * Nunca lança erro — geocodificação é um enriquecimento best-effort, não deve
 * bloquear cadastro/edição de perfil se a rede falhar ou o CEP for inválido.
 */
export async function geocodeByZipCode(zipCode: string): Promise<GeocodeResult | null> {
  const cleaned = zipCode.replace(/\D/g, "")
  if (cleaned.length !== 8) return null

  try {
    const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`)
    if (!viaCepRes.ok) return null
    const viaCep = (await viaCepRes.json()) as ViaCepResponse
    if (viaCep.erro) return null

    const addressParts = [
      viaCep.logradouro,
      viaCep.bairro,
      viaCep.localidade,
      viaCep.uf,
      "Brasil",
    ].filter(Boolean)
    if (addressParts.length === 0) return null

    const query = encodeURIComponent(addressParts.join(", "))
    const nominatimRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`,
      { headers: { "User-Agent": "PlantoesMed/1.0 (contato@plantoesmedicos.com.br)" } }
    )
    if (!nominatimRes.ok) return null
    const results = (await nominatimRes.json()) as NominatimResult[]
    if (!Array.isArray(results) || results.length === 0) return null

    const latitude = parseFloat(results[0].lat)
    const longitude = parseFloat(results[0].lon)
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null

    return { latitude, longitude }
  } catch {
    return null
  }
}
