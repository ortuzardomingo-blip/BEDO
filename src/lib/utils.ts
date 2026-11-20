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
