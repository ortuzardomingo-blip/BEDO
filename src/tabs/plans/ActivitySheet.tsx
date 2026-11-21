import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, ImagePlus, MapPin, RotateCcw, Trash2 } from 'lucide-react'
import { Confirm, Sheet } from '../../components/Sheet'
import { LocationPicker } from '../../components/map/LocationPicker'
import { AddToCalendar } from './AddToCalendar'
import { UploadButton } from '../../components/UploadButton'
import { PhotoViewer } from '../../components/PhotoViewer'
import { PhotoEditSheet } from '../../components/PhotoEditSheet'
import type { Photo } from '../../lib/types'
import { useStore } from '../../store'
import { formatDay, photoDate, todayISO } from '../../lib/utils'

/** Detalle de un plan: editar nombre, fecha, nota y fotos */
export function ActivitySheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { activities, photos, updateActivity, deleteActivity, uploadPhotos } = useStore()
  const activity = activities.find((a) => a.id === id) ?? null
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [view, setView] = useState(-1)
  const [editing, setEditing] = useState<Photo | null>(null)
  const [sched, setSched] = useState('')
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    if (!activity) return
    setTitle(activity.title)
    setNote(activity.note)
    setDate(activity.doneAt ?? todayISO())
    setSched(activity.scheduledFor ?? '')
    // Solo al abrir otro plan
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity?.id])

  const list = useMemo(
    () =>
      photos
        .filter((p) => p.activityId === id)
        .sort((a, b) => photoDate(a).localeCompare(photoDate(b))),
    [photos, id],
  )

  const close = () => {
    if (activity) {
      const patch: Record<string, unknown> = {}
      if (title.trim() && title.trim() !== activity.title) patch.title = title.trim()
      if (note.trim() !== activity.note) patch.note = note.trim()
      if (activity.done && date && date !== activity.doneAt) patch.doneAt = date
      if (!activity.done && (sched || null) !== activity.scheduledFor) patch.scheduledFor = sched || null
      if (Object.keys(patch).length) updateActivity(activity.id, patch)
    }
    onClose()
  }

  return (
    <>
      <Sheet
        open={!!activity}
        onClose={close}
        wide={!!activity?.done}
        title={activity?.done ? activity.title : 'Editar plan'}
        subtitle={
          activity?.done && activity.doneAt ? `Cumplido el ${formatDay(activity.doneAt)}` : undefined
        }
      >
        {activity && (
          <div className="space-y-5">
            <div>
              <label className="label" htmlFor="t">
                Nombre
              </label>
              <input
                id="t"
                className="field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {!activity.done && (
              <div>
                <label className="label" htmlFor="sc">
                  Agendar para
                </label>
                <div className="flex gap-2">
                  <input
                    id="sc"
                    type="date"
                    className="field"
                    value={sched}
                    min={todayISO()}
                    onChange={(e) => setSched(e.target.value)}
                  />
                  {sched && (
                    <button className="btn-ghost shrink-0" onClick={() => setSched('')}>
                      Quitar
                    </button>
                  )}
                </div>
                {sched && (
                  <div className="mt-2">
                    <AddToCalendar title={title || activity.title} date={sched} details="Plan de BEDO" />
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setPicking(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-line p-3.5 text-left transition hover:border-ink/30"
            >
              <MapPin size={20} strokeWidth={1.5} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Lugar</span>
                <span className="block truncate text-xs text-muted">
                  {activity.lat != null
                    ? activity.placeName || 'Ubicación guardada'
                    : 'Sin lugar · sus fotos aparecerán en el mapa'}
                </span>
              </span>
              <ChevronRight size={16} className="text-muted" />
            </button>

            {activity.done && (
              <>
                <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                  <div>
                    <label className="label" htmlFor="dd">
                      Fecha
                    </label>
                    <input
                      id="dd"
                      type="date"
                      className="field"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="nn">
                      Nota
                    </label>
                    <input
                      id="nn"
                      className="field"
                      placeholder="Lo mejor del día fue…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="label mb-0">Fotos · {list.length}</span>
                    <UploadButton
                      className="btn-ghost -mr-3 h-8"
                      onFiles={(f) => uploadPhotos(f, { activityId: activity.id })}
                    >
                      <ImagePlus size={15} /> Agregar
                    </UploadButton>
                  </div>
                  {list.length ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {list.map((p, i) => (
                        <button
                          key={p.id}
                          onClick={() => setView(i)}
                          className="aspect-square overflow-hidden rounded-xl bg-sand"
                        >
                          <img
                            src={p.thumb}
                            alt=""
                            loading="lazy"
                            className="size-full object-cover transition hover:scale-105"
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <UploadButton
                      onFiles={(f) => uploadPhotos(f, { activityId: activity.id })}
                      className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line py-8 text-sm text-muted transition hover:border-ink/30"
                    >
                      <ImagePlus size={22} strokeWidth={1.5} />
                      Agregar fotos de este plan
                    </UploadButton>
                  )}
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
              <button className="btn-ghost -ml-3 text-accent" onClick={() => setConfirm(true)}>
                <Trash2 size={16} /> Eliminar
              </button>
              <div className="flex gap-2">
                {activity.done && (
                  <button
                    className="btn-outline"
                    onClick={() => {
                      updateActivity(activity.id, { done: false, doneAt: null })
                      onClose()
                    }}
                  >
                    <RotateCcw size={15} /> Pendiente
                  </button>
                )}
                <button className="btn-primary px-6" onClick={close}>
                  Listo
                </button>
              </div>
            </div>
          </div>
        )}
      </Sheet>

      <PhotoViewer
        photos={list}
        index={view}
        onClose={() => setView(-1)}
        onEdit={(p) => {
          setView(-1)
          setEditing(p)
        }}
      />
      <PhotoEditSheet photo={editing} onClose={() => setEditing(null)} />
      <LocationPicker
        open={picking}
        onClose={() => setPicking(false)}
        title={`¿Dónde fue “${activity?.title ?? ''}”?`}
        initial={
          activity?.lat != null && activity.lng != null
            ? { lat: activity.lat, lng: activity.lng, name: activity.placeName }
            : null
        }
        onPick={(p) =>
          activity &&
          updateActivity(activity.id, { lat: p?.lat ?? null, lng: p?.lng ?? null, placeName: p?.name ?? '' })
        }
      />
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`¿Eliminar “${activity?.title ?? ''}”?`}
        text="Las fotos del plan se mantienen en el álbum."
        onConfirm={() => {
          if (activity) deleteActivity(activity.id)
          onClose()
        }}
      />
    </>
  )
}
