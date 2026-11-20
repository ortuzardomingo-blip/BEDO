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
import type { Activity, Backend, Photo, PhotoMeta, Settings, Wheel } from './lib/types'
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

interface Store {
  mode: Backend['mode']
  ready: boolean
  settings: Settings
  activities: Activity[]
  photos: Photo[]
  wheels: Wheel[]
  upload: UploadState | null
  toasts: Toast[]
  toast(text: string): void
  updateSettings(patch: Partial<Settings>): void
  addActivity(title: string): Activity
  updateActivity(id: string, patch: Partial<Activity>): void
  deleteActivity(id: string): void
  uploadPhotos(
    files: File[] | FileList,
    opts?: { activityId?: string | null; inFrame?: boolean },
  ): Promise<Photo[]>
  updatePhoto(id: string, patch: Partial<PhotoMeta>): void
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

const strip = (p: Photo): PhotoMeta => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { src, thumb, ...meta } = p
  return meta
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
  const [activities, setActivities] = useState<Activity[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [wheels, setWheels] = useState<Wheel[]>([])
  const [upload, setUpload] = useState<UploadState | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const uploadRef = useRef<UploadState>({ total: 0, done: 0, failed: 0 })

  const stateRef = useRef({ settings, activities, photos, wheels })
  stateRef.current = { settings, activities, photos, wheels }

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  const inflight = useRef<Promise<void> | null>(null)
  const load = useCallback(() => {
    // Evita cargas (y siembras de datos iniciales) duplicadas en paralelo
    if (inflight.current) return inflight.current
    inflight.current = doLoad().finally(() => (inflight.current = null))
    return inflight.current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend])

  const doLoad = async () => {
    try {
      const data = await backend.load()
      if (!data.settings) {
        // Primera vez: cargamos los datos iniciales
        const acts = seedActivities()
        const whs = seedWheels()
        await backend.saveSettings(DEFAULT_SETTINGS)
        await backend.saveActivities(acts)
        await backend.saveWheels(whs)
        data.settings = DEFAULT_SETTINGS
        data.activities = acts
        data.wheels = whs
      }
      setSettings(data.settings)
      setActivities(data.activities)
      setPhotos(data.photos)
      setWheels(data.wheels)
    } catch (e) {
      console.error(e)
      toast('No se pudieron cargar los datos')
    } finally {
      setReady(true)
    }
  }

  useEffect(() => {
    load()
    return backend.subscribe?.(load)
  }, [backend, load])

  const run = useCallback(
    (p: Promise<unknown>) => {
      p.catch((e) => {
        console.error(e)
        toast('Algo falló al guardar. Reintentando sincronizar…')
        load()
      })
    },
    [load, toast],
  )

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const next = { ...stateRef.current.settings, ...patch }
      setSettings(next)
      run(backend.saveSettings(next))
    },
    [backend, run],
  )

  const addActivity = useCallback(
    (title: string) => {
      const list = stateRef.current.activities
      const a: Activity = {
        id: uid(),
        title: title.trim(),
        note: '',
        done: false,
        doneAt: null,
        position: list.reduce((m, x) => Math.max(m, x.position), -1) + 1,
        createdAt: new Date().toISOString(),
      }
      setActivities([...list, a])
      run(backend.saveActivities([a]))
      return a
    },
    [backend, run],
  )

  const updateActivity = useCallback(
    (id: string, patch: Partial<Activity>) => {
      const cur = stateRef.current.activities.find((a) => a.id === id)
      if (!cur) return
      const next = { ...cur, ...patch }
      setActivities((l) => l.map((a) => (a.id === id ? next : a)))
      run(backend.saveActivities([next]))
    },
    [backend, run],
  )

  const deleteActivity = useCallback(
    (id: string) => {
      setActivities((l) => l.filter((a) => a.id !== id))
      setPhotos((l) => l.map((p) => (p.activityId === id ? { ...p, activityId: null } : p)))
      run(backend.deleteActivity(id))
    },
    [backend, run],
  )

  const uploadPhotos = useCallback(
    async (input: File[] | FileList, opts?: { activityId?: string | null; inFrame?: boolean }) => {
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
              createdAt: new Date().toISOString(),
            }
            const photo = await backend.uploadPhoto(meta, img.full, img.thumb)
            added.push(photo)
            setPhotos((l) => [...l.filter((p) => p.id !== photo.id), photo])
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

  const updatePhoto = useCallback(
    (id: string, patch: Partial<PhotoMeta>) => {
      const cur = stateRef.current.photos.find((p) => p.id === id)
      if (!cur) return
      const next = { ...cur, ...patch }
      setPhotos((l) => l.map((p) => (p.id === id ? next : p)))
      run(backend.savePhotos([strip(next)]))
    },
    [backend, run],
  )

  const deletePhoto = useCallback(
    (id: string) => {
      const cur = stateRef.current.photos.find((p) => p.id === id)
      if (!cur) return
      setPhotos((l) => l.filter((p) => p.id !== id))
      run(backend.deletePhoto(strip(cur)))
    },
    [backend, run],
  )

  const addWheel = useCallback(
    (name: string) => {
      const list = stateRef.current.wheels
      const w: Wheel = {
        id: uid(),
        name: name.trim() || 'Nueva ruleta',
        icon: 'sparkles',
        options: [],
        position: list.reduce((m, x) => Math.max(m, x.position), -1) + 1,
      }
      setWheels([...list, w])
      run(backend.saveWheels([w]))
      return w
    },
    [backend, run],
  )

  const updateWheel = useCallback(
    (id: string, patch: Partial<Wheel>) => {
      const cur = stateRef.current.wheels.find((w) => w.id === id)
      if (!cur) return
      const next = { ...cur, ...patch }
      setWheels((l) => l.map((w) => (w.id === id ? next : w)))
      run(backend.saveWheels([next]))
    },
    [backend, run],
  )

  const deleteWheel = useCallback(
    (id: string) => {
      setWheels((l) => l.filter((w) => w.id !== id))
      run(backend.deleteWheel(id))
    },
    [backend, run],
  )

  const value = useMemo<Store>(
    () => ({
      mode: backend.mode,
      ready,
      settings,
      activities,
      photos,
      wheels,
      upload,
      toasts,
      toast,
      updateSettings,
      addActivity,
      updateActivity,
      deleteActivity,
      uploadPhotos,
      updatePhoto,
      deletePhoto,
      addWheel,
      updateWheel,
      deleteWheel,
      signOut,
    }),
    [
      backend.mode,
      ready,
      settings,
      activities,
      photos,
      wheels,
      upload,
      toasts,
      toast,
      updateSettings,
      addActivity,
      updateActivity,
      deleteActivity,
      uploadPhotos,
      updatePhoto,
      deletePhoto,
      addWheel,
      updateWheel,
      deleteWheel,
      signOut,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
