import { useMemo } from 'react'
import { Sheet } from './Sheet'
import { useStore } from '../store'
import type { Photo } from '../lib/types'
import { photoDate } from '../lib/utils'

/** Elegir una foto existente del álbum. Si se pasa `nearDate`, primero las de ese día. */
export function PhotoPicker({
  open,
  onClose,
  onPick,
  title = 'Elegir del álbum',
  nearDate,
}: {
  open: boolean
  onClose: () => void
  onPick: (p: Photo) => void
  title?: string
  nearDate?: string
}) {
  const { photos } = useStore()
  const sorted = useMemo(() => {
    const list = photos.slice().sort((a, b) => photoDate(b).localeCompare(photoDate(a)))
    if (!nearDate) return list
    const same = list.filter((p) => photoDate(p).slice(0, 10) === nearDate)
    return [...same, ...list.filter((p) => !same.includes(p))]
  }, [photos, nearDate])

  return (
    <Sheet open={open} onClose={onClose} title={title} wide>
      {sorted.length ? (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {sorted.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onPick(p)
                onClose()
              }}
              className="aspect-square overflow-hidden rounded-xl bg-sand transition hover:opacity-80"
            >
              <img src={p.thumb} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted">Aún no hay fotos en el álbum.</p>
      )}
    </Sheet>
  )
}
