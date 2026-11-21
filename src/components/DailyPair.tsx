import { useRef, useState } from 'react'
import { Camera, Images, X } from 'lucide-react'
import { useStore } from '../store'
import { PhotoPicker } from './PhotoPicker'
import { PhotoViewer } from './PhotoViewer'
import { ACCEPT_IMAGES } from '../lib/images'
import type { DailyWho, Photo } from '../lib/types'
import { cn } from '../lib/utils'

/** Fotos del día de una fecha: { a, b } */
export function dailyOf(photos: Photo[], date: string) {
  const out: Partial<Record<DailyWho, Photo>> = {}
  for (const p of photos) if (p.dailyDate === date && p.dailyWho) out[p.dailyWho] = p
  return out
}

/**
 * Las dos fotos del día, una por persona (pensado para la selfie de cada uno).
 * Cada espacio permite sacar/subir una foto, elegir del álbum, verla o quitarla.
 */
export function DailyPair({ date, compact }: { date: string; compact?: boolean }) {
  const { photos, settings, uploadPhotos, patchRow } = useStore()
  const pair = dailyOf(photos, date)
  const [who, setWho] = useState<DailyWho>('a')
  const [picking, setPicking] = useState(false)
  const [view, setView] = useState<Photo | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const names: Record<DailyWho, string> = { a: settings.nameA || 'Uno', b: settings.nameB || 'Otro' }

  const assign = (p: Photo, w: DailyWho) => {
    const prev = pair[w]
    if (prev && prev.id !== p.id) patchRow('photos', prev.id, { dailyDate: null, dailyWho: null })
    patchRow('photos', p.id, { dailyDate: date, dailyWho: w })
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        {(['a', 'b'] as DailyWho[]).map((w) => {
          const p = pair[w]
          return (
            <div key={w}>
              <div className={cn('relative overflow-hidden rounded-2xl', compact ? 'aspect-[4/5]' : 'aspect-[3/4]')}>
                {p ? (
                  <>
                    <button className="size-full bg-sand" onClick={() => setView(p)}>
                      <img src={p.thumb} alt="" className="size-full object-cover" />
                    </button>
                    <button
                      className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/45 text-white backdrop-blur"
                      onClick={() => patchRow('photos', p.id, { dailyDate: null, dailyWho: null })}
                      aria-label="Quitar de la foto del día"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <div className="flex size-full flex-col items-stretch justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line p-2">
                    <button
                      className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl text-sm text-muted transition hover:bg-sand/60 hover:text-ink"
                      onClick={() => {
                        setWho(w)
                        fileRef.current?.click()
                      }}
                    >
                      <Camera size={22} strokeWidth={1.5} />
                      Subir foto
                    </button>
                    <button
                      className="flex items-center justify-center gap-1 rounded-xl py-1.5 text-xs text-muted transition hover:bg-sand/60 hover:text-ink"
                      onClick={() => {
                        setWho(w)
                        setPicking(true)
                      }}
                    >
                      <Images size={13} /> Del álbum
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-center text-xs font-medium text-ink-soft">{names[w]}</p>
            </div>
          )
        })}
      </div>

      {/* En el celular ofrece cámara o galería */}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT_IMAGES}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) uploadPhotos([f], { dailyDate: date, dailyWho: who })
        }}
      />
      <PhotoPicker
        open={picking}
        nearDate={date}
        title={`Foto de ${names[who]}`}
        onClose={() => setPicking(false)}
        onPick={(p) => assign(p, who)}
      />
      <PhotoViewer photos={view ? [view] : []} index={view ? 0 : -1} onClose={() => setView(null)} />
    </>
  )
}
