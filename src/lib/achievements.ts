import {
  Award,
  BookHeart,
  Camera,
  CalendarHeart,
  Compass,
  Flame,
  Frame,
  Heart,
  Images,
  ListChecks,
  MapPin,
  Mountain,
  PiggyBank,
  Plane,
  Popcorn,
  Star,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import type { Tables, Settings } from './types'
import { daysSince, distanceKm, SANTIAGO } from './utils'
import { photoCoords } from './geo'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: LucideIcon
  /** Progreso actual y meta */
  value: number
  goal: number
}

export function computeAchievements(t: Tables, settings: Settings, dailyStreak: number): Achievement[] {
  const done = t.activities.filter((a) => a.done).length
  const located = t.photos.map((p) => photoCoords(p, t.activities)).filter((c) => !!c)
  const maxKm = located.reduce((m, c) => Math.max(m, distanceKm(SANTIAGO, c!)), 0)
  const rated = t.places.filter((p) => p.ratingA != null || p.ratingB != null).length
  const goalsDone = t.goals.filter((g) => g.target > 0 && g.entries.reduce((s, e) => s + e.amount, 0) >= g.target).length
  const watched = t.items.filter((i) => (i.list === 'peliculas' || i.list === 'series') && i.done).length
  const together = settings.since ? daysSince(settings.since) : 0
  const daily = t.photos.filter((p) => p.dailyDate).length

  const a = (id: string, title: string, description: string, icon: LucideIcon, value: number, goal: number): Achievement => ({
    id,
    title,
    description,
    icon,
    value: Math.min(value, goal),
    goal,
  })

  return [
    a('foto1', 'Primer recuerdo', 'Subir la primera foto', Camera, t.photos.length, 1),
    a('foto100', 'Fotógrafos', 'Llegar a 100 fotos', Images, t.photos.length, 100),
    a('foto500', 'Archivo de amor', 'Llegar a 500 fotos', Images, t.photos.length, 500),
    a('marco', 'Enmarcados', 'Elegir 5 fotos para el marco', Frame, t.photos.filter((p) => p.inFrame).length, 5),
    a('plan1', 'Primer plan', 'Cumplir el primer plan', ListChecks, done, 1),
    a('plan10', 'Imparables', 'Cumplir 10 planes', Trophy, done, 10),
    a('plan25', 'Leyendas', 'Cumplir 25 planes', Award, done, 25),
    a('planAll', 'Lista completa', 'Cumplir todos los planes de la lista', Star, done, Math.max(t.activities.length, 1)),
    a('mapa5', 'Exploradores', 'Marcar 5 lugares en el mapa', MapPin, new Set(located.map((c) => `${c!.lat.toFixed(2)},${c!.lng.toFixed(2)}`)).size, 5),
    a('lejos100', 'Fuera de Santiago', 'Una foto a más de 100 km', Mountain, maxKm >= 100 ? 1 : 0, 1),
    a('lejos1000', 'Lejos de casa', 'Una foto a más de 1.000 km', Plane, maxKm >= 1000 ? 1 : 0, 1),
    a('lugares10', 'Críticos gourmet', 'Calificar 10 lugares', Compass, rated, 10),
    a('racha7', 'Constantes', '7 días seguidos con foto del día', Flame, dailyStreak, 7),
    a('racha30', 'Un mes entero', '30 días seguidos con foto del día', Flame, dailyStreak, 30),
    a('diario50', 'Diario de a dos', '50 fotos del día en total', CalendarHeart, daily, 50),
    a('ahorro', 'Ahorradores', 'Completar una meta de la alcancía', PiggyBank, goalsDone, 1),
    a('cine', 'Cinéfilos', 'Ver 10 películas o series de la lista', Popcorn, watched, 10),
    a('historia', 'Nuestra historia', 'Registrar 5 momentos importantes', BookHeart, t.milestones.length, 5),
    a('dias100', '100 días', 'Cumplir 100 días juntos', Heart, together, 100),
    a('anio1', 'Un año', 'Cumplir un año juntos', Heart, together, 365),
    a('anio3', 'Tres años', 'Cumplir tres años juntos', Heart, together, 365 * 3),
    a('anio5', 'Cinco años', 'Cumplir cinco años juntos', Heart, together, 365 * 5),
  ]
}
