import type { Activity, CalEvent, EventKind, Settings } from './types'
import { isoDate, parseDate, todayISO } from './utils'

export interface AgendaItem {
  key: string
  date: string
  title: string
  kind: EventKind | 'plan'
  yearly: boolean
  /** Años que se cumplen (aniversarios/cumpleaños) */
  years?: number
  ref: { type: 'event' | 'activity' | 'since'; id: string }
}

export const KIND_LABEL: Record<AgendaItem['kind'], string> = {
  aniversario: 'Aniversario',
  cumpleanos: 'Cumpleaños',
  cita: 'Cita',
  viaje: 'Viaje',
  otro: 'Otro',
  plan: 'Plan',
}

interface Src {
  events: CalEvent[]
  activities: Activity[]
  settings: Settings
}

/** Todos los eventos entre dos fechas (incluidas), repitiendo los anuales */
export function agendaBetween(from: string, to: string, { events, activities, settings }: Src): AgendaItem[] {
  const out: AgendaItem[] = []
  const y0 = parseDate(from).getFullYear()
  const y1 = parseDate(to).getFullYear()

  const yearlyIn = (base: string, push: (d: string, years: number) => void) => {
    const b = parseDate(base)
    for (let y = y0; y <= y1; y++) {
      const d = isoDate(new Date(y, b.getMonth(), b.getDate()))
      if (d >= from && d <= to && d >= base) push(d, y - b.getFullYear())
    }
  }

  if (settings.since) {
    yearlyIn(settings.since, (d, years) => {
      if (years > 0)
        out.push({
          key: `since-${d}`,
          date: d,
          title: `Aniversario · ${years} ${years === 1 ? 'año' : 'años'}`,
          kind: 'aniversario',
          yearly: true,
          years,
          ref: { type: 'since', id: 'since' },
        })
    })
  }

  for (const e of events) {
    const push = (d: string, years?: number) =>
      out.push({ key: `${e.id}-${d}`, date: d, title: e.title, kind: e.kind, yearly: e.yearly, years, ref: { type: 'event', id: e.id } })
    if (e.yearly) yearlyIn(e.date, (d, years) => push(d, years))
    else if (e.date >= from && e.date <= to) push(e.date)
  }

  for (const a of activities) {
    if (!a.done && a.scheduledFor && a.scheduledFor >= from && a.scheduledFor <= to)
      out.push({ key: `act-${a.id}`, date: a.scheduledFor, title: a.title, kind: 'plan', yearly: false, ref: { type: 'activity', id: a.id } })
  }

  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/** Próximos eventos desde hoy */
export function upcoming(src: Src, limit = 3): AgendaItem[] {
  const today = todayISO()
  const end = isoDate(new Date(new Date().getFullYear() + 1, 11, 31))
  return agendaBetween(today, end, src).slice(0, limit)
}
