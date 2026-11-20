import { useEffect, useState } from 'react'
import { Frame, Trash2 } from 'lucide-react'
import { Confirm, Sheet } from './Sheet'
import type { Photo } from '../lib/types'
import { useStore } from '../store'
import { cn, formatDay, photoDate } from '../lib/utils'

export function PhotoEditSheet({ photo, onClose }: { photo: Photo | null; onClose: () => void }) {
  const { activities, updatePhoto, deletePhoto } = useStore()
  const [caption, setCaption] = useState('')
  const [activityId, setActivityId] = useState('')
  const [inFrame, setInFrame] = useState(false)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (!photo) return
    setCaption(photo.caption)
    setActivityId(photo.activityId ?? '')
    setInFrame(photo.inFrame)
  }, [photo])

  const save = () => {
    if (!photo) return
    updatePhoto(photo.id, { caption: caption.trim(), activityId: activityId || null, inFrame })
    onClose()
  }

  const sorted = activities.slice().sort((a, b) => Number(b.done) - Number(a.done) || a.title.localeCompare(b.title))

  return (
    <>
      <Sheet open={!!photo} onClose={onClose} title="Editar foto" subtitle={photo && formatDay(photoDate(photo))}>
        {photo && (
          <div className="space-y-5">
            <img
              src={photo.thumb}
              alt=""
              className="mx-auto max-h-56 rounded-2xl object-contain shadow-soft"
            />
            <div>
              <label className="label" htmlFor="cap">
                Descripción
              </label>
              <input
                id="cap"
                className="field"
                placeholder="Un recuerdo…"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="act">
                Plan asociado
              </label>
              <select
                id="act"
                className="field appearance-none"
                value={activityId}
                onChange={(e) => setActivityId(e.target.value)}
              >
                <option value="">Ninguno</option>
                {sorted.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.done ? '✓ ' : ''}
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setInFrame((v) => !v)}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition',
                inFrame ? 'border-ink bg-sand' : 'border-line hover:border-ink/30',
              )}
            >
              <Frame size={20} strokeWidth={1.5} />
              <span className="flex-1">
                <span className="block text-sm font-medium">Mostrar en el marco</span>
                <span className="block text-xs text-muted">Aparece alrededor de la app</span>
              </span>
              <span
                className={cn(
                  'relative h-6 w-10 rounded-full transition',
                  inFrame ? 'bg-ink' : 'bg-line',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all',
                    inFrame ? 'left-[18px]' : 'left-0.5',
                  )}
                />
              </span>
            </button>
            <div className="flex items-center justify-between gap-2 pt-1">
              <button className="btn-ghost -ml-3 text-accent" onClick={() => setConfirm(true)}>
                <Trash2 size={16} /> Eliminar
              </button>
              <button className="btn-primary px-6" onClick={save}>
                Guardar
              </button>
            </div>
          </div>
        )}
      </Sheet>
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title="¿Eliminar esta foto?"
        text="Se borrará para ambos y no se puede deshacer."
        onConfirm={() => {
          if (photo) deletePhoto(photo.id)
          onClose()
        }}
      />
    </>
  )
}
