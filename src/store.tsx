import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  type DailyWho,
  type Activity,
  type Backend,
  type Photo,
  type PhotoMeta,
  type RowOf,
  type Settings,
  type TableName,
  type Tables,
  type Wheel,
} from './lib/types'
import { DEFAULT_SETTINGS, seedActivities, seedWheels } from './lib/seed'
import { processImage, isImageFile } from './lib/images'
import { uid } from './lib/utils'

export interface UploadState {
  total: number
  done: number
  failed: number
}

interface Toast {
  id: number
  text: string
}

export interface UploadOpts {
  activityId?: string | null
  inFrame?: boolean
  dailyDate?: string | null
  dailyWho?: DailyWho | null
}

interface Store extends Tables {
  mode: Backend['mode']
  ready: boolean
  settings: Settings
  upload: UploadState | null
  toasts: Toast[]
  toast(text: string): void
  updateSettings(patch: Partial<Settings>): void
  // Genéricos
  saveRow<T extends TableName>(table: T, row: RowOf<T>): void
  patchRow<T extends TableName>(table: T, id: string, patch: Partial<RowOf<T>>): void
  removeRow(table: TableName, id: string): void
  // Específicos
  addActivity(title: string): Activity
  updateActivity(id: string, patch: Partial<Activity>): void
  deleteActivity(id: string): void
  uploadPhotos(files: File[] | FileList, opts?: UploadOpts): Promise<Photo[]>
  updatePhoto(id: string, patch: Partial<PhotoMeta>): void
  updatePhotos(ids: string[], patch: Partial<PhotoMeta>): void
  deletePhoto(id: string): void
  addWheel(name: string): Wheel
  updateWheel(id: string, patch: Partial<Wheel>): void
  deleteWheel(id: string): void
  signOut?: () => void
}

const Ctx = createContext<Store | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore fuera de StoreProvider')
  return s
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Quita las URLs (src/thumb) antes de guardar una foto */
const persistable = (table: TableName, row: any) => {
  if (table !== 'photos') return row
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { src, thumb, ...meta } = row
  return meta
}

const EMPTY: Tables = {
  activities: [],
  photos: [],
  wheels: [],
  events: [],
  goals: [],
  places: [],
  milestones: [],
  items: [],
}

export function StoreProvider({
  backend,
  signOut,
  children,
}: {
  backend: Backend
  signOut?: () => void
  children: ReactNode
}) {
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [tables, setTables] = useState<Tables>(EMPTY)
  const [upload, setUpload] = useState<UploadState | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const uploadRef = useRef<UploadState>({ total: 0, done: 0, failed: 0 })

  const stateRef = useRef({ settings, tables })
  stateRef.current = { settings, tables }

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  const doLoad = async () => {
    try {
      const data = await backend.load()
      if (!data.settings) {
        // Primera vez: cargamos los datos iniciales
        const acts = seedActivities()
        const whs = seedWheels()
        await backend.saveSettings(DEFAULT_SETTINGS)
        await backend.save('activities', acts)
        await backend.save('wheels', whs)
        data.settings = DEFAULT_SETTINGS
        data.tables.activities = acts
        data.tables.wheels = whs
      }
      setSettings(data.settings)
      setTables(data.tables)
    } catch (e) {
      console.error(e)
      toast('No se pudieron cargar los datos')
    } finally {
      setReady(true)
    }
  }

  const inflight = useRef<Promise<void> | null>(null)
  const load = useCallback(() => {
    // Evita cargas (y siembras de datos iniciales) duplicadas en paralelo
    if (inflight.current) return inflight.current
    inflight.current = doLoad().finally(() => (inflight.current = null))
    return inflight.current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend])

  useEffect(() => {
    load()
    return backend.subscribe?.(load)
  }, [backend, load])

  const run = useCallback(
    (p: Promise<unknown>) => {
      p.catch((e) => {
        console.error(e)
        toast(
          e?.code === 'PGRST204' || e?.code === 'PGRST205'
            ? 'Falta actualizar la base de datos (migración SQL)'
            : 'Algo falló al guardar. Reintentando sincronizar…',
        )
        load()
      })
    },
    [load, toast],
  )

  // ---------- Genéricos ----------
  const setRows = (table: TableName, fn: (rows: any[]) => any[]) =>
    setTables((t) => ({ ...t, [table]: fn(t[table] as any[]) }))

  const saveRow = useCallback(
    (table: TableName, row: any) => {
      setRows(table, (rows) => {
        const i = rows.findIndex((r) => r.id === row.id)
        if (i < 0) return [...rows, row]
        const copy = rows.slice()
        copy[i] = row
        return copy
      })
      run(backend.save(table, [persistable(table, row)]))
    },
    [backend, run],
  ) as Store['saveRow']

  const patchRows = useCallback(
    (table: TableName, ids: string[], patch: any) => {
      const cur = (stateRef.current.tables[table] as any[]).filter((r) => ids.includes(r.id))
      if (!cur.length) return
      const next = cur.map((r) => ({ ...r, ...patch }))
      setRows(table, (rows) => rows.map((r) => next.find((n) => n.id === r.id) ?? r))
      run(backend.save(table, next.map((r) => persistable(table, r))))
    },
    [backend, run],
  )

  const patchRow = useCallback(
    (table: TableName, id: string, patch: any) => patchRows(table, [id], patch),
    [patchRows],
  ) as Store['patchRow']

  const removeRow = useCallback(
    (table: TableName, id: string) => {
      setTables((t) => {
        const next: any = { ...t, [table]: (t[table] as any[]).filter((r) => r.id !== id) }
        if (table === 'activities') {
          next.photos = t.photos.map((p) => (p.activityId === id ? { ...p, activityId: null } : p))
          next.goals = t.goals.map((g) => (g.activityId === id ? { ...g, activityId: null } : g))
        }
        return next
      })
      run(backend.remove(table, id))
    },
    [backend, run],
  )

  // ---------- Ajustes ----------
  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const next = { ...stateRef.current.settings, ...patch }
      setSettings(next)
      run(backend.saveSettings(next))
    },
    [backend, run],
  )

  // ---------- Planes ----------
  const addActivity = useCallback(
    (title: string) => {
      const list = stateRef.current.tables.activities
      const a: Activity = {
        id: uid(),
        title: title.trim(),
        note: '',
        done: false,
        doneAt: null,
        scheduledFor: null,
        lat: null,
        lng: null,
        placeName: '',
        position: list.reduce((m, x) => Math.max(m, x.position), -1) + 1,
        createdAt: new Date().toISOString(),
      }
      saveRow('activities', a)
      return a
    },
    [saveRow],
  )

  // ---------- Fotos ----------
  const uploadPhotos = useCallback(
    async (input: File[] | FileList, opts?: UploadOpts) => {
      const files = Array.from(input).filter(isImageFile)
      const skipped = Array.from(input).length - files.length
      if (skipped) toast(`${skipped} archivo(s) no son imágenes y se omitieron`)
      if (!files.length) return []

      const counts = uploadRef.current
      counts.total += files.length
      const sync = () => setUpload({ ...counts })
      sync()
      const added: Photo[] = []
      // De a 2 en paralelo: rápido sin saturar el celular
      let idx = 0
      const worker = async () => {
        while (idx < files.length) {
          const file = files[idx++]
          try {
            const img = await processImage(file)
            const id = uid()
            const meta: PhotoMeta = {
              id,
              path: `${id}.jpg`,
              thumbPath: `thumbs/${id}.jpg`,
              caption: '',
              takenAt: img.takenAt,
              activityId: opts?.activityId ?? null,
              inFrame: opts?.inFrame ?? false,
              width: img.width,
              height: img.height,
              lat: img.lat,
              lng: img.lng,
              dailyDate: opts?.dailyDate ?? null,
              dailyWho: opts?.dailyDate ? (opts.dailyWho ?? 'a') : null,
              createdAt: new Date().toISOString(),
            }
            const photo = await backend.uploadPhoto(meta, img.full, img.thumb)
            added.push(photo)
            setRows('photos', (l) => [...l.filter((p) => p.id !== photo.id), photo])
            counts.done++
          } catch (e) {
            console.error(e)
            counts.done++
            counts.failed++
          }
          sync()
        }
      }
      await Promise.all([worker(), worker()])
      if (counts.done >= counts.total) {
        if (counts.failed) toast(`${counts.failed} foto(s) no se pudieron subir`)
        else toast(counts.total === 1 ? 'Foto guardada' : `${counts.total} fotos guardadas`)
        uploadRef.current = { total: 0, done: 0, failed: 0 }
        setUpload(null)
      }
      return added
    },
    [backend, toast],
  )

  const deletePhoto = useCallback(
    (id: string) => {
      const cur = stateRef.current.tables.photos.find((p) => p.id === id)
      if (!cur) return
      setTables((t) => ({
        ...t,
        photos: t.photos.filter((p) => p.id !== id),
        milestones: t.milestones.map((m) => (m.photoId === id ? { ...m, photoId: null } : m)),
      }))
      run(backend.deletePhoto(persistable('photos', cur)))
    },
    [backend, run],
  )

  // ---------- Ruletas ----------
  const addWheel = useCallback(
    (name: string) => {
      const list = stateRef.current.tables.wheels
      const w: Wheel = {
        id: uid(),
        name: name.trim() || 'Nueva ruleta',
        icon: 'sparkles',
        options: [],
        position: list.reduce((m, x) => Math.max(m, x.position), -1) + 1,
      }
      saveRow('wheels', w)
      return w
    },
    [saveRow],
  )

  const value = useMemo<Store>(
    () => ({
      ...tables,
      mode: backend.mode,
      ready,
      settings,
      upload,
      toasts,
      toast,
      updateSettings,
      saveRow,
      patchRow,
      removeRow,
      addActivity,
      updateActivity: (id, patch) => patchRow('activities', id, patch),
      deleteActivity: (id) => removeRow('activities', id),
      uploadPhotos,
      updatePhoto: (id, patch) => patchRow('photos', id, patch),
      updatePhotos: (ids, patch) => patchRows('photos', ids, patch),
      deletePhoto,
      addWheel,
      updateWheel: (id, patch) => patchRow('wheels', id, patch),
      deleteWheel: (id) => removeRow('wheels', id),
      signOut,
    }),
    [
      tables,
      backend.mode,
      ready,
      settings,
      upload,
      toasts,
      toast,
      updateSettings,
      saveRow,
      patchRow,
      patchRows,
      removeRow,
      addActivity,
      uploadPhotos,
      deletePhoto,
      addWheel,
      signOut,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
