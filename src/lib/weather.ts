import { SANTIAGO } from './utils'

export interface Weather {
  temp: number
  code: number
  isDay: boolean
  max: number
  min: number
}

export type Mood = 'lluvia' | 'calor' | 'templado' | 'frio' | 'noche'

/** Clima actual de Santiago (Open-Meteo: gratis y sin clave) */
export async function fetchWeather(): Promise<Weather> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.search = new URLSearchParams({
    latitude: String(SANTIAGO.lat),
    longitude: String(SANTIAGO.lng),
    current: 'temperature_2m,weather_code,is_day',
    daily: 'temperature_2m_max,temperature_2m_min',
    forecast_days: '1',
    timezone: 'America/Santiago',
  }).toString()
  const r = await fetch(url)
  if (!r.ok) throw new Error('clima')
  const d = await r.json()
  return {
    temp: d.current.temperature_2m,
    code: d.current.weather_code,
    isDay: d.current.is_day === 1,
    max: d.daily.temperature_2m_max[0],
    min: d.daily.temperature_2m_min[0],
  }
}

export function describe(code: number): string {
  if (code === 0) return 'Despejado'
  if (code <= 2) return 'Parcial'
  if (code === 3) return 'Nublado'
  if (code <= 48) return 'Neblina'
  if (code <= 57) return 'Llovizna'
  if (code <= 67) return 'Lluvia'
  if (code <= 77) return 'Nieve'
  if (code <= 82) return 'Chubascos'
  return 'Tormenta'
}

export function moodOf(w: Weather): Mood {
  if (w.code >= 51) return 'lluvia'
  if (!w.isDay) return 'noche'
  if (w.max >= 27) return 'calor'
  if (w.max < 15) return 'frio'
  return 'templado'
}

export const MOOD_TEXT: Record<Mood, string> = {
  lluvia: 'Día de lluvia: perfecto para algo bajo techo',
  calor: 'Hace calor: algo fresco o al aire libre',
  templado: 'Día ideal para salir',
  frio: 'Hace frío: algo calentito',
  noche: 'Para esta noche',
}

export const SUGGESTIONS: Record<Mood, string[]> = {
  lluvia: [
    'Maratón de películas con cabritas',
    'Juegos de mesa y sopaipillas pasadas',
    'Museo de Bellas Artes',
    'Cocinar algo nuevo juntos',
    'Cine en el Costanera',
    'Fuerte de frazadas y series',
    'Café largo en Lastarria',
  ],
  calor: [
    'Mote con huesillo en el Santa Lucía',
    'Helado en Emporio La Rosa',
    'Picnic al atardecer en el Bicentenario',
    'Embalse El Yeso',
    'Piscina o río en el Cajón del Maipo',
    'Terraza con jugo natural en Barrio Italia',
  ],
  templado: [
    'Teleférico del San Cristóbal',
    'Bici por el Mapocho',
    'Picnic en el Parque Forestal',
    'Pasear por Barrio Italia',
    'Trekking suave en el Cerro Manquehue',
    'Paseo por la Quinta Normal',
    'Feria y almuerzo en el Mercado Central',
  ],
  frio: [
    'Chocolate caliente en Lastarria',
    'Termas en el Cajón del Maipo',
    'Planetario USACH',
    'Sopaipillas y té en casa',
    'Ramen o sushi calentito',
    'Cine y cabritas',
  ],
  noche: [
    'Sky Costanera de noche',
    'Karaoke',
    'Ver las estrellas lejos de la ciudad',
    'Cena en Patio Bellavista',
    'Pizza casera y película',
    'Paseo nocturno por el Santa Lucía',
  ],
}
