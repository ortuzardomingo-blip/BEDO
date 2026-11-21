import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Frame, MapPin, UploadCloud, X } from 'lucide-react'
import { useStore } from '../../store'
import { UploadButton } from '../../components/UploadButton'
import { PhotoViewer } from '../../components/PhotoViewer'
import { PhotoEditSheet } from '../../components/PhotoEditSheet'
import { LocationPicker } from '../../components/map/LocationPicker'
import type { Photo } from '../../lib/types'
import { cn, formatMonth, photoDate } from '../../lib/utils'

type Filter = 'all' | 'plans' | 'frame' | 'noloc'

export function PhotosView() {
  const { photos, activities, uploadPhotos, updatePhotos, toast } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [viewIndex, setViewIndex] = useState(-1)
  const [editing, setEditing] = useState<Photo | null>(null)
  const [dragging, setDragging] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [locating, setLocating] = useState(false)

  const actOf = (id: string | null) => activities.find((a) => a.id === id)
  const hasLoc = (p: Photo) =>
    (p.lat != null && p.lng != null) || (actOf(p.activityId)?.lat != null)

  const sorted = useMemo(() => {
    const list = photos.filter((p) =>
      filter === 'plans'
        ? !!p.activityId
        : filter === 'frame'
          ? p.inFrame
          : filter === 'noloc'
            ? !hasLoc(p)
            : true,
    )
    return list.sort((a, b) => photoDate(b).localeCompare(photoDate(a)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, activities, filter])

  const groups = useMemo(() => {
    const m = new Map<string, { label: string; items: { p: Photo; i: number }[] }>()
    sorted.forEach((p, i) => {
      const key = photoDate(p).slice(0, 7)
      if (!m.has(key)) m.set(key, { label: formatMonth(key + '-01'), items: [] })
      m.get(key)!.items.push({ p, i })
    })
    return [...m.values()]
  }, [sorted])

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

  const counts: Record<Filter, number> = {
    all: photos.length,
    plans: photos.filter((p) => p.activityId).length,
    frame: photos.filter((p) => p.inFrame).length,
    noloc: photos.filter((p) => !hasLoc(p)).length,
  }

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const endSelect = () => {
    setSelecting(false)
    setSelected(new Set())
  }

  if (!photos.length) {
    return (
      <UploadButton
        onFiles={(f) => uploadPhotos(f)}
        className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-line bg-card/50 px-6 py-16 text-center transition hover:border-ink/25 hover:bg-card"
      >
        <span className="grid size-14 place-items-center rounded-full bg-sand text-ink-soft">
          <UploadCloud size={24} strokeWidth={1.5} />
        </span>
        <span className="font-serif text-xl">Suban su primera foto</span>
        <span className="max-w-xs text-sm text-muted">
          Toca para elegir desde la galería o arrastra fotos aquí. JPG, PNG, HEIC (iPhone), WEBP, GIF y
          más.
        </span>
      </UploadButton>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Los filtros se desplazan solo dentro de su espacio, sin pasar bajo "Seleccionar" */}
        <div className="no-scrollbar -ml-4 flex min-w-0 flex-1 gap-2 overflow-x-auto pr-3 pl-4 [mask-image:linear-gradient(90deg,#000_88%,transparent)]">
          {(
            [
              ['all', 'Todas'],
              ['plans', 'De planes'],
              ['frame', 'En el marco'],
              ['noloc', 'Sin ubicación'],
            ] as [Filter, string][]
          ).map(([k, label]) => (
            <button key={k} className={filter === k ? 'chip-on' : 'chip-off'} onClick={() => setFilter(k)}>
              {label}
              <span className={cn('tabular-nums', filter === k ? 'text-paper/60' : 'text-muted')}>
                {counts[k]}
              </span>
            </button>
          ))}
        </div>
        <button
          className={cn('shrink-0', selecting ? 'chip-on' : 'chip-off')}
          onClick={() => (selecting ? endSelect() : setSelecting(true))}
        >
          {selecting ? 'Cancelar' : 'Seleccionar'}
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted">
          {filter === 'frame'
            ? 'Ninguna foto en el marco aún. Abre una foto y activa “Mostrar en el marco”.'
            : filter === 'noloc'
              ? '¡Todas las fotos tienen ubicación!'
              : 'Aún no hay fotos asociadas a planes.'}
        </p>
      ) : (
        <div className="mt-6 space-y-10">
          {groups.map((g) => (
            <div key={g.label}>
              <h2 className="mb-3 font-serif text-lg text-ink-soft italic">{g.label}</h2>
              <div className="columns-2 gap-2.5 sm:columns-3 sm:gap-3 xl:columns-4">
                {g.items.map(({ p, i }) => {
                  const sel = selected.has(p.id)
                  const act = actOf(p.activityId)
                  return (
                    <motion.button
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => (selecting ? toggle(p.id) : setViewIndex(i))}
                      className="group relative mb-2.5 block w-full overflow-hidden rounded-2xl bg-sand sm:mb-3"
                      style={{ aspectRatio: `${p.width} / ${p.height}` }}
                    >
                      <img
                        src={p.thumb}
                        alt={p.caption}
                        loading="lazy"
                        className={cn(
                          'size-full object-cover transition duration-500',
                          selecting ? (sel ? 'scale-[0.92] rounded-xl' : '') : 'group-hover:scale-[1.03]',
                        )}
                      />
                      {!selecting && (p.caption || act) && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-2.5 pt-8 text-left text-xs text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                          {p.caption && <p className="line-clamp-2 font-medium">{p.caption}</p>}
                          {act && (
                            <p className="mt-0.5 flex items-center gap-1 text-white/80">
                              <MapPin size={11} /> {act.title}
                            </p>
                          )}
                        </div>
                      )}
                      {selecting ? (
                        <span
                          className={cn(
                            'absolute top-2 left-2 grid size-6 place-items-center rounded-full border-2 transition',
                            sel ? 'border-ink bg-ink text-paper' : 'border-white bg-black/15 text-transparent',
                          )}
                        >
                          <Check size={13} strokeWidth={3} />
                        </span>
                      ) : (
                        p.inFrame && (
                          <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-white/85 text-ink backdrop-blur">
                            <Frame size={12} />
                          </span>
                        )
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Barra de acciones de la selección */}
      <AnimatePresence>
        {selecting && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-lg items-center gap-1 rounded-full bg-ink p-1.5 pl-4 text-paper shadow-lift md:bottom-8"
          >
            <span className="flex-1 text-sm tabular-nums">
              {selected.size ? `${selected.size} seleccionada${selected.size === 1 ? '' : 's'}` : 'Toca las fotos'}
            </span>
            <button
              className="btn h-9 px-3 text-paper hover:bg-paper/10"
              disabled={!selected.size}
              onClick={() => setLocating(true)}
            >
              <MapPin size={15} /> Ubicación
            </button>
            <button
              className="btn h-9 px-3 text-paper hover:bg-paper/10"
              disabled={!selected.size}
              onClick={() => {
                updatePhotos([...selected], { inFrame: true })
                toast('Agregadas al marco')
                endSelect()
              }}
            >
              <Frame size={15} /> Marco
            </button>
            <button className="btn-icon size-9 text-paper hover:bg-paper/10" onClick={endSelect} aria-label="Cancelar">
              <X size={17} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <LocationPicker
        open={locating}
        onClose={() => setLocating(false)}
        title={`Ubicación de ${selected.size} foto${selected.size === 1 ? '' : 's'}`}
        onPick={(p) => {
          updatePhotos([...selected], { lat: p?.lat ?? null, lng: p?.lng ?? null })
          toast(p ? 'Ubicación guardada' : 'Ubicación quitada')
          endSelect()
        }}
      />

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
    </>
  )
}
