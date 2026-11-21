export interface Settings {
  title: string
  nameA: string
  nameB: string
  /** Fecha (YYYY-MM-DD) desde la que están juntos */
  since: string | null
}

export interface Activity {
  id: string
  title: string
  note: string
  done: boolean
  /** Fecha (YYYY-MM-DD) en que se cumplió */
  doneAt: string | null
  /** Fecha agendada (YYYY-MM-DD) */
  scheduledFor: string | null
  /** Lugar donde se hizo (para el mapa) */
  lat: number | null
  lng: number | null
  placeName: string
  position: number
  createdAt: string
}

export type DailyWho = 'a' | 'b'

/** Las fotos subidas desde "La foto del día" viven aparte, solo en el diario */
export const DAILY_PREFIX = 'daily/'
export const isDailyOnly = (p: { path: string }) => p.path.startsWith(DAILY_PREFIX)

/** Datos persistidos de una foto */
export interface PhotoMeta {
  id: string
  path: string
  thumbPath: string
  caption: string
  takenAt: string | null
  activityId: string | null
  inFrame: boolean
  width: number
  height: number
  lat: number | null
  lng: number | null
  /** Si es la "foto del día", la fecha que representa */
  dailyDate: string | null
  /** De quién es la foto del día: 'a' (nombre 1) o 'b' (nombre 2) */
  dailyWho: DailyWho | null
  createdAt: string
}

/** Foto lista para mostrar (con URLs resueltas) */
export interface Photo extends PhotoMeta {
  src: string
  thumb: string
}

export interface Wheel {
  id: string
  name: string
  icon: string
  options: string[]
  position: number
}

export type EventKind = 'aniversario' | 'cumpleanos' | 'cita' | 'viaje' | 'otro'

export interface CalEvent {
  id: string
  title: string
  date: string
  kind: EventKind
  /** Se repite cada año */
  yearly: boolean
  note: string
  createdAt: string
}

export interface GoalEntry {
  id: string
  amount: number
  date: string
  note: string
}

export interface Goal {
  id: string
  title: string
  target: number
  activityId: string | null
  entries: GoalEntry[]
  createdAt: string
}

export interface Place {
  id: string
  name: string
  kind: string
  lat: number | null
  lng: number | null
  address: string
  ratingA: number | null
  ratingB: number | null
  note: string
  visitedAt: string | null
  createdAt: string
}

export interface Milestone {
  id: string
  title: string
  date: string
  note: string
  photoId: string | null
  createdAt: string
}

export interface ListItem {
  id: string
  list: string
  title: string
  note: string
  done: boolean
  createdAt: string
}

export interface Tables {
  activities: Activity[]
  photos: Photo[]
  wheels: Wheel[]
  events: CalEvent[]
  goals: Goal[]
  places: Place[]
  milestones: Milestone[]
  items: ListItem[]
}
export type TableName = keyof Tables
export type RowOf<T extends TableName> = Tables[T][number]

export const TABLE_NAMES: TableName[] = [
  'activities',
  'photos',
  'wheels',
  'events',
  'goals',
  'places',
  'milestones',
  'items',
]

export interface AppData {
  settings: Settings | null
  tables: Tables
}

export interface Backend {
  mode: 'local' | 'cloud'
  load(): Promise<AppData>
  saveSettings(s: Settings): Promise<void>
  /** Inserta o actualiza filas (las fotos se guardan sin src/thumb) */
  save(table: TableName, rows: object[]): Promise<void>
  remove(table: TableName, id: string): Promise<void>
  uploadPhoto(meta: PhotoMeta, full: Blob, thumb: Blob): Promise<Photo>
  /** Mueve los archivos de una foto a otra ruta (p.ej. al diario) y actualiza su fila */
  movePhoto(p: PhotoMeta, path: string, thumbPath: string): Promise<Photo>
  deletePhoto(p: PhotoMeta): Promise<void>
  subscribe?(onChange: () => void): () => void
}
