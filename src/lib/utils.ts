export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto && window.isSecureContext) {
    return crypto.randomUUID()
  }
  // Fallback (p.ej. al probar desde el celular por http en la red local)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function todayISO(): string {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

const monthFmt = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' })
const dayFmt = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })

/** Interpreta 'YYYY-MM-DD' como fecha local (no UTC) */
export function parseDate(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(s)
}

export function formatMonth(s: string): string {
  const t = monthFmt.format(parseDate(s))
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function formatDay(s: string): string {
  return dayFmt.format(parseDate(s)).replace('.', '')
}

export function daysSince(s: string): number {
  const start = parseDate(s)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((now.getTime() - start.getTime()) / 86400000))
}

export function cn(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ')
}

export function photoDate(p: { takenAt: string | null; createdAt: string }): string {
  return p.takenAt ?? p.createdAt
}

/** Fecha local YYYY-MM-DD de un Date */
export function isoDate(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

/** Días desde hoy hasta la fecha (negativo si ya pasó) */
export function daysUntil(s: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((parseDate(s).getTime() - now.getTime()) / 86400000)
}

/** Próxima ocurrencia (hoy o después) de una fecha que se repite cada año */
export function nextYearly(s: string): { date: string; years: number } {
  const base = parseDate(s)
  const today = todayISO()
  let y = new Date().getFullYear()
  let d = isoDate(new Date(y, base.getMonth(), base.getDate()))
  if (d < today) d = isoDate(new Date(++y, base.getMonth(), base.getDate()))
  return { date: d, years: y - base.getFullYear() }
}

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
export const formatCLP = (n: number) => clp.format(Math.round(n))

const longFmt = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
export function formatLong(s: string): string {
  const t = longFmt.format(parseDate(s))
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString('es-CL')} ${n === 1 ? one : many}`
}

/** Racha de días seguidos (hasta hoy o ayer) con foto del día */
export function dailyStreak(dates: Set<string>): number {
  let d = todayISO()
  if (!dates.has(d)) d = addDays(d, -1)
  let n = 0
  while (dates.has(d)) {
    n++
    d = addDays(d, -1)
  }
  return n
}

// ---------- Calendario externo ----------
const compact = (s: string) => s.replace(/-/g, '')

export function googleCalendarUrl(title: string, date: string, details = '', yearly = false) {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${compact(date)}/${compact(addDays(date, 1))}`,
    details,
  })
  if (yearly) p.set('recur', 'RRULE:FREQ=YEARLY')
  return `https://calendar.google.com/calendar/render?${p}`
}

/** Descarga un .ics (sirve para el calendario del iPhone y Outlook) */
export function downloadIcs(title: string, date: string, details = '', yearly = false) {
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BEDO//ES',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@bedo`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${compact(date)}`,
    `DTEND;VALUE=DATE:${compact(addDays(date, 1))}`,
    `SUMMARY:${esc(title)}`,
    details && `DESCRIPTION:${esc(details)}`,
    yearly && 'RRULE:FREQ=YEARLY',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${title.replace(/[^\w\s-]/g, '').trim() || 'evento'}.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// ---------- Geografía ----------
export const SANTIAGO = { lat: -33.4489, lng: -70.6693 }

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}
