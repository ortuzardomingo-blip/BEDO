import { createStore, del, get, set } from 'idb-keyval'
import type { Activity, AppData, Backend, Photo, PhotoMeta, Settings, Wheel } from './types'

/**
 * Backend "modo local": guarda todo en el navegador (IndexedDB).
 * Sirve para probar la app sin configurar Supabase. Los datos NO se comparten entre dispositivos.
 */
interface Stored {
  settings: Settings | null
  activities: Activity[]
  photos: PhotoMeta[]
  wheels: Wheel[]
}

const store = createStore('bedo-local', 'kv')
const urlCache = new Map<string, string>()

async function readAll(): Promise<Stored> {
  return (
    (await get<Stored>('data', store)) ?? { settings: null, activities: [], photos: [], wheels: [] }
  )
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

function upsert<T extends { id: string }>(arr: T[], items: T[]) {
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
    return {
      settings: d.settings,
      activities: d.activities,
      wheels: d.wheels,
      photos: await Promise.all(d.photos.map(resolve)),
    }
  },
  saveSettings: (s) => mutate((d) => void (d.settings = s)),
  saveActivities: (list) => mutate((d) => upsert(d.activities, list)),
  deleteActivity: (id) =>
    mutate((d) => {
      d.activities = d.activities.filter((a) => a.id !== id)
      d.photos.forEach((p) => p.activityId === id && (p.activityId = null))
    }),
  async uploadPhoto(meta, full, thumb) {
    await set(`blob:${meta.path}`, full, store)
    await set(`blob:${meta.thumbPath}`, thumb, store)
    await mutate((d) => upsert(d.photos, [meta]))
    return resolve(meta)
  },
  savePhotos: (list) => mutate((d) => upsert(d.photos, list)),
  async deletePhoto(p) {
    await mutate((d) => void (d.photos = d.photos.filter((x) => x.id !== p.id)))
    await del(`blob:${p.path}`, store)
    await del(`blob:${p.thumbPath}`, store)
  },
  saveWheels: (list) => mutate((d) => upsert(d.wheels, list)),
  deleteWheel: (id) => mutate((d) => void (d.wheels = d.wheels.filter((w) => w.id !== id))),
}
