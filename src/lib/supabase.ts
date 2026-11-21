import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  TABLE_NAMES,
  type AppData,
  type Backend,
  type Photo,
  type PhotoMeta,
  type Settings,
  type Tables,
} from './types'
import { normalize, toCamel, toSnake } from './normalize'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
// "Publishable key" (sb_publishable_...) — antes se llamaba "anon key"
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

const BUCKET = 'photos'
const SIGN_TTL = 60 * 60 * 24 * 7 // 7 días

/* eslint-disable @typescript-eslint/no-explicit-any */
const toSettings = (r: any): Settings => ({
  title: r.title ?? 'BEDO',
  nameA: r.name_a ?? '',
  nameB: r.name_b ?? '',
  since: r.since,
})

function check<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error
  return res.data as T
}

/** Tabla aún no creada (falta correr la migración SQL) */
const isMissingTable = (e: any) => e?.code === 'PGRST205' || e?.code === '42P01'

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
      const [s, ...results] = await Promise.all([
        sb.from('settings').select('*').eq('id', 1).maybeSingle(),
        ...TABLE_NAMES.map((t) => sb.from(t).select('*')),
      ])
      const tables = {} as Tables
      TABLE_NAMES.forEach((t, i) => {
        const r = results[i]
        if (r.error && isMissingTable(r.error)) {
          console.warn(`Tabla "${t}" no existe aún: corre la migración SQL`)
          ;(tables as any)[t] = []
          return
        }
        ;(tables as any)[t] = check(r).map((row: any) => normalize(t, toCamel(row)))
      })
      const metas = tables.photos as unknown as PhotoMeta[]
      await signPaths(sb, metas.flatMap((m) => [m.path, m.thumbPath]))
      tables.photos = metas.map(withUrls)
      const sRow = check(s)
      return { settings: sRow ? toSettings(sRow) : null, tables }
    },
    async saveSettings(st) {
      check(
        await sb
          .from('settings')
          .upsert({ id: 1, title: st.title, name_a: st.nameA, name_b: st.nameB, since: st.since }),
      )
    },
    async save(table, rows) {
      if (rows.length) check(await sb.from(table).upsert(rows.map((r) => toSnake(r as any))))
    },
    async remove(table, id) {
      check(await sb.from(table).delete().eq('id', id))
    },
    async uploadPhoto(meta, full, thumb) {
      const up = async (path: string, blob: Blob) =>
        check(
          await sb.storage
            .from(BUCKET)
            .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true }),
        )
      await Promise.all([up(meta.path, full), up(meta.thumbPath, thumb)])
      check(await sb.from('photos').insert(toSnake(meta as any)))
      await signPaths(sb, [meta.path, meta.thumbPath])
      return withUrls(meta)
    },
    async movePhoto(p, path, thumbPath) {
      const store = sb.storage.from(BUCKET)
      const mv = async (from: string, to: string) => {
        const { error } = await store.move(from, to)
        if (error) throw error
      }
      await mv(p.path, path)
      await mv(p.thumbPath, thumbPath)
      const meta = { ...p, path, thumbPath }
      check(await sb.from('photos').update({ path, thumb_path: thumbPath }).eq('id', p.id))
      await signPaths(sb, [path, thumbPath])
      return withUrls(meta)
    },
    async deletePhoto(p) {
      check(await sb.from('photos').delete().eq('id', p.id))
      await sb.storage.from(BUCKET).remove([p.path, p.thumbPath])
    },
    subscribe(onChange) {
      let t: ReturnType<typeof setTimeout> | undefined
      const fire = () => {
        clearTimeout(t)
        t = setTimeout(onChange, 700)
      }
      const ch = sb.channel('bedo-sync')
      for (const table of ['settings', ...TABLE_NAMES]) {
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
