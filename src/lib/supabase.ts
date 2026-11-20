import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Activity, AppData, Backend, Photo, PhotoMeta, Settings, Wheel } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
// "Publishable key" (sb_publishable_...) — antes se llamaba "anon key"
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

const BUCKET = 'photos'
const SIGN_TTL = 60 * 60 * 24 * 7 // 7 días

// ---------- mapeo filas <-> objetos ----------
/* eslint-disable @typescript-eslint/no-explicit-any */
const toActivity = (r: any): Activity => ({
  id: r.id,
  title: r.title,
  note: r.note ?? '',
  done: r.done,
  doneAt: r.done_at,
  position: r.position ?? 0,
  createdAt: r.created_at,
})
const fromActivity = (a: Activity) => ({
  id: a.id,
  title: a.title,
  note: a.note,
  done: a.done,
  done_at: a.doneAt,
  position: a.position,
  created_at: a.createdAt,
})
const toPhoto = (r: any): PhotoMeta => ({
  id: r.id,
  path: r.path,
  thumbPath: r.thumb_path,
  caption: r.caption ?? '',
  takenAt: r.taken_at,
  activityId: r.activity_id,
  inFrame: r.in_frame,
  width: r.width ?? 4,
  height: r.height ?? 3,
  createdAt: r.created_at,
})
const fromPhoto = (p: PhotoMeta) => ({
  id: p.id,
  path: p.path,
  thumb_path: p.thumbPath,
  caption: p.caption,
  taken_at: p.takenAt,
  activity_id: p.activityId,
  in_frame: p.inFrame,
  width: p.width,
  height: p.height,
  created_at: p.createdAt,
})
const toWheel = (r: any): Wheel => ({
  id: r.id,
  name: r.name,
  icon: r.icon ?? 'sparkles',
  options: Array.isArray(r.options) ? r.options : [],
  position: r.position ?? 0,
})
const toSettings = (r: any): Settings => ({
  title: r.title ?? 'BEDO',
  nameA: r.name_a ?? '',
  nameB: r.name_b ?? '',
  since: r.since,
})
/* eslint-enable @typescript-eslint/no-explicit-any */

function check<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error
  return res.data as T
}

// Cache de URLs firmadas para no volver a descargar imágenes en cada recarga
const signed = new Map<string, { url: string; exp: number }>()

async function signPaths(sb: SupabaseClient, paths: string[]) {
  const now = Date.now()
  const missing = paths.filter((p) => {
    const c = signed.get(p)
    return !c || c.exp < now + 60 * 60 * 1000
  })
  for (let i = 0; i < missing.length; i += 500) {
    const chunk = missing.slice(i, i + 500)
    const data = check(await sb.storage.from(BUCKET).createSignedUrls(chunk, SIGN_TTL))
    for (const d of data) {
      if (d.signedUrl && d.path) signed.set(d.path, { url: d.signedUrl, exp: now + SIGN_TTL * 1000 })
    }
  }
}

function withUrls(m: PhotoMeta): Photo {
  return { ...m, src: signed.get(m.path)?.url ?? '', thumb: signed.get(m.thumbPath)?.url ?? '' }
}

export function createSupabaseBackend(sb: SupabaseClient): Backend {
  return {
    mode: 'cloud',
    async load(): Promise<AppData> {
      const [s, a, p, w] = await Promise.all([
        sb.from('settings').select('*').eq('id', 1).maybeSingle(),
        sb.from('activities').select('*').order('position'),
        sb.from('photos').select('*'),
        sb.from('wheels').select('*').order('position'),
      ])
      const metas = check(p).map(toPhoto)
      await signPaths(sb, metas.flatMap((m) => [m.path, m.thumbPath]))
      const sRow = check(s)
      return {
        settings: sRow ? toSettings(sRow) : null,
        activities: check(a).map(toActivity),
        photos: metas.map(withUrls),
        wheels: check(w).map(toWheel),
      }
    },
    async saveSettings(st) {
      check(
        await sb
          .from('settings')
          .upsert({ id: 1, title: st.title, name_a: st.nameA, name_b: st.nameB, since: st.since }),
      )
    },
    async saveActivities(list) {
      if (list.length) check(await sb.from('activities').upsert(list.map(fromActivity)))
    },
    async deleteActivity(id) {
      check(await sb.from('activities').delete().eq('id', id))
    },
    async uploadPhoto(meta, full, thumb) {
      const up = async (path: string, blob: Blob) =>
        check(
          await sb.storage
            .from(BUCKET)
            .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true }),
        )
      await Promise.all([up(meta.path, full), up(meta.thumbPath, thumb)])
      check(await sb.from('photos').insert(fromPhoto(meta)))
      await signPaths(sb, [meta.path, meta.thumbPath])
      return withUrls(meta)
    },
    async savePhotos(list) {
      if (list.length) check(await sb.from('photos').upsert(list.map(fromPhoto)))
    },
    async deletePhoto(p) {
      check(await sb.from('photos').delete().eq('id', p.id))
      await sb.storage.from(BUCKET).remove([p.path, p.thumbPath])
    },
    async saveWheels(list) {
      if (list.length)
        check(
          await sb.from('wheels').upsert(
            list.map((w) => ({
              id: w.id,
              name: w.name,
              icon: w.icon,
              options: w.options,
              position: w.position,
            })),
          ),
        )
    },
    async deleteWheel(id) {
      check(await sb.from('wheels').delete().eq('id', id))
    },
    subscribe(onChange) {
      let t: ReturnType<typeof setTimeout> | undefined
      const fire = () => {
        clearTimeout(t)
        t = setTimeout(onChange, 700)
      }
      const ch = sb.channel('bedo-sync')
      for (const table of ['settings', 'activities', 'photos', 'wheels']) {
        ch.on('postgres_changes', { event: '*', schema: 'public', table }, fire)
      }
      ch.subscribe()
      return () => {
        clearTimeout(t)
        sb.removeChannel(ch)
      }
    },
  }
}
