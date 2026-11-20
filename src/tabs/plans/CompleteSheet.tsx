import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { UploadButton } from '../../components/UploadButton'
import type { Activity } from '../../lib/types'
import { useStore } from '../../store'
import { todayISO } from '../../lib/utils'
import { celebrate } from '../../lib/celebrate'

/** Se abre al hacer check en un plan: fecha, nota y fotos del recuerdo */
export function CompleteSheet({
  activity,
  onClose,
}: {
  activity: Activity | null
  onClose: () => void
}) {
  const { updateActivity, uploadPhotos } = useStore()
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [files, setFiles] = useState<File[]>([])

  useEffect(() => {
    if (!activity) return
    setDate(todayISO())
    setNote(activity.note)
    setFiles([])
  }, [activity])

  const previews = useMemo(
    () =>
      files.map((f) => ({
        f,
        // HEIC no se puede previsualizar en la mayoría de navegadores; se muestra un recuadro
        url: /hei[cf]/i.test(f.type + f.name) ? '' : URL.createObjectURL(f),
      })),
    [files],
  )
  useEffect(() => () => previews.forEach((p) => p.url && URL.revokeObjectURL(p.url)), [previews])

  const submit = () => {
    if (!activity) return
    updateActivity(activity.id, { done: true, doneAt: date || todayISO(), note: note.trim() })
    if (files.length) uploadPhotos(files, { activityId: activity.id })
    celebrate()
    onClose()
  }

  return (
    <Sheet
      open={!!activity}
      onClose={onClose}
      title={activity ? `¡${activity.title}!` : ''}
      subtitle="Guarden el recuerdo de este plan cumplido."
    >
      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="d">
            ¿Cuándo fue?
          </label>
          <input
            id="d"
            type="date"
            className="field"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="n">
            Nota <span className="normal-case tracking-normal text-muted/70">(opcional)</span>
          </label>
          <textarea
            id="n"
            className="field h-auto min-h-20 resize-none py-3"
            placeholder="Lo mejor del día fue…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div>
          <span className="label">Fotos</span>
          <div className="grid grid-cols-4 gap-2">
            {previews.map((p, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-sand">
                {p.url ? (
                  <img src={p.url} alt="" className="size-full object-cover" />
                ) : (
                  <span className="grid size-full place-items-center text-[10px] text-muted">
                    HEIC
                  </span>
                )}
                <button
                  className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/50 text-white"
                  onClick={() => setFiles((l) => l.filter((x) => x !== p.f))}
                  aria-label="Quitar"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <UploadButton
              onFiles={(f) => setFiles((l) => [...l, ...f])}
              className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-line text-muted transition hover:border-ink/30 hover:text-ink"
            >
              <ImagePlus size={20} strokeWidth={1.5} />
            </UploadButton>
          </div>
          <p className="mt-2 text-xs text-muted">También pueden agregar fotos más tarde.</p>
        </div>
        <button className="btn-primary h-12 w-full text-base" onClick={submit}>
          Marcar como cumplido
        </button>
      </div>
    </Sheet>
  )
}
