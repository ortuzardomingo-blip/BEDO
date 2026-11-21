import type { Activity, Photo } from './types'

export interface LatLng {
  lat: number
  lng: number
}

/** Ubicación de una foto: la propia (GPS) o la del plan al que pertenece */
export function photoCoords(p: Photo, activities: Activity[]): LatLng | null {
  if (p.lat != null && p.lng != null) return { lat: p.lat, lng: p.lng }
  const a = p.activityId ? activities.find((x) => x.id === p.activityId) : null
  if (a?.lat != null && a?.lng != null) return { lat: a.lat, lng: a.lng }
  return null
}

export interface PhotoGroup extends LatLng {
  key: string
  photos: Photo[]
  label: string
}

/** Agrupa fotos cercanas (~300 m) en un solo pin */
export function groupPhotos(photos: Photo[], activities: Activity[]): PhotoGroup[] {
  const m = new Map<string, PhotoGroup>()
  for (const p of photos) {
    const c = photoCoords(p, activities)
    if (!c) continue
    const key = `${c.lat.toFixed(3)},${c.lng.toFixed(3)}`
    let g = m.get(key)
    if (!g) {
      const act = activities.find((a) => a.id === p.activityId)
      g = { key, lat: c.lat, lng: c.lng, photos: [], label: act?.placeName || act?.title || '' }
      m.set(key, g)
    }
    g.photos.push(p)
  }
  return [...m.values()]
}

export interface GeoResult extends LatLng {
  name: string
  address: string
}

/** Buscador de lugares (OpenStreetMap / Nominatim, gratis) */
export async function searchPlaces(q: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.search = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '6',
    countrycodes: 'cl',
    'accept-language': 'es',
  }).toString()
  const res = await fetch(url, { signal })
  if (!res.ok) return []
  const data: { lat: string; lon: string; name?: string; display_name: string }[] = await res.json()
  return data.map((d) => ({
    lat: Number(d.lat),
    lng: Number(d.lon),
    name: d.name || d.display_name.split(',')[0],
    address: d.display_name.split(',').slice(0, 3).join(','),
  }))
}
