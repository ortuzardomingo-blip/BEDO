import type { TableName } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Completa valores por defecto (filas antiguas o columnas nuevas aún vacías) */
const DEFAULTS: Record<TableName, Record<string, unknown>> = {
  activities: { note: '', done: false, doneAt: null, scheduledFor: null, lat: null, lng: null, placeName: '', position: 0 },
  photos: { caption: '', takenAt: null, activityId: null, inFrame: false, width: 4, height: 3, lat: null, lng: null, dailyDate: null, dailyWho: null },
  wheels: { icon: 'sparkles', options: [], position: 0 },
  events: { kind: 'otro', yearly: false, note: '' },
  goals: { target: 0, activityId: null, entries: [] },
  places: { kind: 'restaurante', lat: null, lng: null, address: '', ratingA: null, ratingB: null, note: '', visitedAt: null },
  milestones: { note: '', photoId: null },
  items: { list: 'peliculas', note: '', done: false },
}

export function normalize(table: TableName, row: any): any {
  const out: any = { ...DEFAULTS[table] }
  // Los null toman el valor por defecto ('' en textos, null en lo opcional)
  for (const [k, v] of Object.entries(row)) if (v !== null && v !== undefined) out[k] = v
  for (const k of Object.keys(row)) if (row[k] === null && !(k in out)) out[k] = null
  if (table === 'wheels' && !Array.isArray(out.options)) out.options = []
  if (table === 'goals' && !Array.isArray(out.entries)) out.entries = []
  if (table === 'goals') out.target = Number(out.target) || 0
  if (table === 'photos' && out.dailyDate && !out.dailyWho) out.dailyWho = 'a'
  return out
}

export const toSnake = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase()), v]))

export const toCamel = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v]))
