import { createStore, del, get, set } from 'idb-keyval'
import {
  TABLE_NAMES,
  type AppData,
  type Backend,
  type Photo,
  type PhotoMeta,
  type Settings,
  type TableName,
  type Tables,
} from './types'
import { normalize } from './normalize'

/**
 * Backend "modo local": guarda todo en el navegador (IndexedDB).
 * Sirve para probar la app sin configurar Supabase. Los datos NO se comparten entre dispositivos.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Stored = { settings: Settings | null } & Partial<Record<TableName, any[]>>

const store = createStore('bedo-local', 'kv')
const urlCache = new Map<string, string>()

async function readAll(): Promise<Stored> {
  return (await get<Stored>('data', store)) ?? { settings: null }
}

let queue: Promise<unknown> = Promise.resolve()
/** Serializa escrituras para que no se pisen */
function mutate(fn: (d: Stored) => void | Promise<void>): Promise<void> {
  const next = queue.then(async () => {
    const d = await readAll()
    await fn(d)
    await set('data', d, store)
  })
  queue = next.catch(() => {})
  return next
}

async function blobUrl(path: string): Promise<string> {
  const cached = urlCache.get(path)
  if (cached) return cached
  const blob = await get<Blob>(`blob:${path}`, store)
  const url = blob ? URL.createObjectURL(blob) : ''
  urlCache.set(path, url)
  return url
}

async function resolve(m: PhotoMeta): Promise<Photo> {
  return { ...m, src: await blobUrl(m.path), thumb: await blobUrl(m.thumbPath) }
}

function upsert(arr: any[], items: any[]) {
  for (const it of items) {
    const i = arr.findIndex((x) => x.id === it.id)
    if (i >= 0) arr[i] = it
    else arr.push(it)
  }
}

export const localBackend: Backend = {
  mode: 'local',
  async load(): Promise<AppData> {
    const d = await readAll()
    const tables = {} as Tables
    for (const t of TABLE_NAMES) {
      const rows = (d[t] ?? []).map((r) => normalize(t, r))
      ;(tables as any)[t] = t === 'photos' ? await Promise.all(rows.map(resolve)) : rows
    }
    return { settings: d.settings, tables }
  },
  saveSettings: (s) => mutate((d) => void (d.settings = s)),
  save: (table, rows) => mutate((d) => upsert((d[table] ??= []), rows)),
  remove: (table, id) =>
    mutate((d) => {
      d[table] = (d[table] ?? []).filter((r) => r.id !== id)
      // Equivalente a "on delete set null" de la base de datos
      if (table === 'activities') {
        d.photos?.forEach((p) => p.activityId === id && (p.activityId = null))
        d.goals?.forEach((g) => g.activityId === id && (g.activityId = null))
      }
    }),
  async uploadPhoto(meta, full, thumb) {
    await set(`blob:${meta.path}`, full, store)
    await set(`blob:${meta.thumbPath}`, thumb, store)
    await mutate((d) => upsert((d.photos ??= []), [meta]))
    return resolve(meta)
  },
  async movePhoto(p, path, thumbPath) {
    for (const [from, to] of [
      [p.path, path],
      [p.thumbPath, thumbPath],
    ]) {
      const blob = await get<Blob>(`blob:${from}`, store)
      if (blob) await set(`blob:${to}`, blob, store)
      await del(`blob:${from}`, store)
      urlCache.delete(from)
    }
    const meta = { ...p, path, thumbPath }
    await mutate((d) => upsert((d.photos ??= []), [meta]))
    return resolve(meta)
  },
  async deletePhoto(p) {
    await mutate((d) => {
      d.photos = (d.photos ?? []).filter((x) => x.id !== p.id)
      d.milestones?.forEach((m) => m.photoId === p.id && (m.photoId = null))
    })
    await del(`blob:${p.path}`, store)
    await del(`blob:${p.thumbPath}`, store)
  },
}
