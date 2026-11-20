import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Frame, ImagePlus, MapPin, UploadCloud } from 'lucide-react'
import { useStore } from '../store'
import { UploadButton } from '../components/UploadButton'
import { PhotoViewer } from '../components/PhotoViewer'
import { PhotoEditSheet } from '../components/PhotoEditSheet'
import type { Photo } from '../lib/types'
import { cn, formatMonth, photoDate } from '../lib/utils'

type Filter = 'all' | 'plans' | 'frame'

export function Album() {
  const { photos, activities, uploadPhotos } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [viewIndex, setViewIndex] = useState(-1)
  const [editing, setEditing] = useState<Photo | null>(null)
  const [dragging, setDragging] = useState(false)

  const sorted = useMemo(() => {
    const list = photos.filter((p) =>
      filter === 'plans' ? !!p.activityId : filter === 'frame' ? p.inFrame : true,
    )
    return list.sort((a, b) => photoDate(b).localeCompare(photoDate(a)))
  }, [photos, filter])

  const groups = useMemo(() => {
    const m = new Map<string, { label: string; items: { p: Photo; i: number }[] }>()
    sorted.forEach((p, i) => {
      const d = photoDate(p)
      const key = d.slice(0, 7)
      if (!m.has(key)) m.set(key, { label: formatMonth(key + '-01'), items: [] })
      m.get(key)!.items.push({ p, i })
    })
    return [...m.values()]
  }, [sorted])

  const actTitle = (id: string | null) => activities.find((a) => a.id === id)?.title

  // Arrastrar y soltar en PC
  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files')
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth++
      setDragging(true)
    }
    const leave = () => {
      depth = Math.max(0, depth - 1)
      if (!depth) setDragging(false)
    }
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault()
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      if (e.dataTransfer?.files.length) uploadPhotos(e.dataTransfer.files)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [uploadPhotos])

  const counts = {
    all: photos.length,
    plans: photos.filter((p) => p.activityId).length,
    frame: photos.filter((p) => p.inFrame).length,
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-light tracking-tight sm:text-5xl">Álbum</h1>
          <p className="mt-1 text-sm text-muted">
            {photos.length === 0
              ? 'Todavía no hay fotos'
              : `${photos.length} ${photos.length === 1 ? 'recuerdo' : 'recuerdos'}`}
          </p>
        </div>
        <UploadButton className="btn-primary" onFiles={(f) => uploadPhotos(f)}>
          <ImagePlus size={17} /> Subir fotos
        </UploadButton>
      </div>

      {photos.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4">
          {(
            [
              ['all', 'Todas'],
              ['plans', 'De planes'],
              ['frame', 'En el marco'],
            ] as [Filter, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              className={filter === k ? 'chip-on' : 'chip-off'}
              onClick={() => setFilter(k)}
            >
              {label}
              <span className={cn('tabular-nums', filter === k ? 'text-paper/60' : 'text-muted')}>
                {counts[k]}
              </span>
            </button>
          ))}
        </div>
      )}

      {photos.length === 0 ? (
        <UploadButton
          onFiles={(f) => uploadPhotos(f)}
          className="mt-8 flex w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-line bg-card/50 px-6 py-16 text-center transition hover:border-ink/25 hover:bg-card"
        >
          <span className="grid size-14 place-items-center rounded-full bg-sand text-ink-soft">
            <UploadCloud size={24} strokeWidth={1.5} />
          </span>
          <span className="font-serif text-xl">Suban su primera foto</span>
          <span className="max-w-xs text-sm text-muted">
            Toca para elegir desde la galería o arrastra fotos aquí. JPG, PNG, HEIC (iPhone), WEBP,
            GIF y más.
          </span>
        </UploadButton>
      ) : sorted.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted">
          {filter === 'frame'
            ? 'Ninguna foto en el marco aún. Abre una foto y activa “Mostrar en el marco”.'
            : 'Aún no hay fotos asociadas a planes.'}
        </p>
      ) : (
        <div className="mt-6 space-y-10">
          {groups.map((g) => (
            <div key={g.label}>
              <h2 className="mb-3 font-serif text-lg italic text-ink-soft">{g.label}</h2>
              <div className="columns-2 gap-2.5 sm:columns-3 sm:gap-3 xl:columns-4">
                {g.items.map(({ p, i }) => (
                  <motion.button
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setViewIndex(i)}
                    className="group relative mb-2.5 block w-full overflow-hidden rounded-2xl bg-sand sm:mb-3"
                    style={{ aspectRatio: `${p.width} / ${p.height}` }}
                  >
                    <img
                      src={p.thumb}
                      alt={p.caption}
                      loading="lazy"
                      className="size-full object-cover transition duration-700 group-hover:scale-[1.03]"
                    />
                    {(p.caption || p.activityId) && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-2.5 pt-8 text-left text-xs text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                        {p.caption && <p className="line-clamp-2 font-medium">{p.caption}</p>}
                        {p.activityId && (
                          <p className="mt-0.5 flex items-center gap-1 text-white/80">
                            <MapPin size={11} /> {actTitle(p.activityId)}
                          </p>
                        )}
                      </div>
                    )}
                    {p.inFrame && (
                      <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-white/85 text-ink backdrop-blur">
                        <Frame size={12} />
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <PhotoViewer
        photos={sorted}
        index={viewIndex}
        onClose={() => setViewIndex(-1)}
        onEdit={(p) => {
          setViewIndex(-1)
          setEditing(p)
        }}
      />
      <PhotoEditSheet photo={editing} onClose={() => setEditing(null)} />

      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[3000] grid place-items-center bg-paper/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-ink/30 px-16 py-12">
              <UploadCloud size={36} strokeWidth={1.25} />
              <p className="font-serif text-2xl">Suelta para subir</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
