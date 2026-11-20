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
  position: number
  createdAt: string
}

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

export interface AppData {
  settings: Settings | null
  activities: Activity[]
  photos: Photo[]
  wheels: Wheel[]
}

export interface Backend {
  mode: 'local' | 'cloud'
  load(): Promise<AppData>
  saveSettings(s: Settings): Promise<void>
  saveActivities(list: Activity[]): Promise<void>
  deleteActivity(id: string): Promise<void>
  uploadPhoto(meta: PhotoMeta, full: Blob, thumb: Blob): Promise<Photo>
  savePhotos(list: PhotoMeta[]): Promise<void>
  deletePhoto(p: PhotoMeta): Promise<void>
  saveWheels(list: Wheel[]): Promise<void>
  deleteWheel(id: string): Promise<void>
  subscribe?(onChange: () => void): () => void
}
