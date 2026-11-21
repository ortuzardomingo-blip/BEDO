import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Check, Heart, ImagePlus, Images, Plus, Trash2, X } from 'lucide-react'
import { useStore } from '../../store'
import { Confirm, Sheet } from '../../components/Sheet'
import { PhotoPicker } from '../../components/PhotoPicker'
import { PhotoViewer } from '../../components/PhotoViewer'
import { UploadButton } from '../../components/UploadButton'
import type { Milestone, Photo } from '../../lib/types'
import { cn, formatDay, todayISO, uid } from '../../lib/utils'

interface Entry {
  key: string
  date: string
  title: string
  note: string
  photo: Photo | null
  type: 'milestone' | 'since' | 'plan'
  milestone?: Milestone
}

const SUGGESTIONS = [
  'Cuando nos conocimos',
  'Nuestra primera cita',
  'Primer beso',
  'Nos pusimos de novios',
  'Primer viaje juntos',
  'Conocimos a las familias',
  'Primer “te amo”',
]

export function HistoryView() {
  const { milestones, activities, photos, settings } = useStore()
  const [withPlans, setWithPlans] = useState(true)
  const [editing, setEditing] = useState<Milestone | 'new' | null>(null)
  const [viewing, setViewing] = useState<Photo | null>(null)

  const entries = useMemo(() => {
    const photoOf = (id: string | null) => photos.find((p) => p.id === id) ?? null
    const list: Entry[] = milestones.map((m) => ({
      key: m.id,
      date: m.date,
      title: m.title,
      note: m.note,
      photo: photoOf(m.photoId),
      type: 'milestone',
      milestone: m,
    }))
    if (settings.since)
      list.push({ key: 'since', date: settings.since, title: 'Comenzamos nuestra historia', note: '', photo: null, type: 'since' })
    if (withPlans)
      for (const a of activities)
        if (a.done && a.doneAt)
          list.push({
            key: a.id,
            date: a.doneAt,
            title: a.title,
            note: a.note,
            photo: photos.find((p) => p.activityId === a.id) ?? null,
            type: 'plan',
          })
    return list.sort((a, b) => a.date.localeCompare(b.date))
  }, [milestones, activities, photos, settings.since, withPlans])

  let lastYear = ''

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button className={withPlans ? 'chip-on' : 'chip-off'} onClick={() => setWithPlans((v) => !v)}>
          {withPlans && <Check size={14} />} Incluir planes cumplidos
        </button>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          <Plus size={16} /> Momento
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-line p-8 text-center">
          <Heart size={28} strokeWidth={1.25} className="mx-auto text-accent" />
          <p className="mt-2 font-serif text-xl">Escriban su historia</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Agreguen los momentos importantes: cuando se conocieron, la primera cita, el primer viaje…
          </p>
        </div>
      ) : (
        <ol className="relative mt-8 ml-3 border-l border-line pl-7 sm:ml-4 sm:pl-9">
          {entries.map((e, i) => {
            const year = e.date.slice(0, 4)
            const showYear = year !== lastYear
            lastYear = year
            const big = e.type !== 'plan'
            return (
              <li key={e.key} className="relative pb-8 last:pb-0">
                {showYear && (
                  <p className="mb-3 -ml-1 font-serif text-3xl font-light text-muted/70 sm:text-4xl">{year}</p>
                )}
                <span
                  className={cn(
                    'absolute -left-[33px] grid place-items-center rounded-full ring-4 ring-paper sm:-left-[41px]',
                    showYear ? 'top-[52px] sm:top-[60px]' : 'top-1',
                    big ? 'size-3.5 bg-accent' : 'size-2.5 translate-x-0.5 bg-ink/40',
                  )}
                />
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: Math.min(i * 0.02, 0.2) }}
                >
                  <button
                    disabled={e.type !== 'milestone'}
                    onClick={() => e.milestone && setEditing(e.milestone)}
                    className="block w-full text-left"
                  >
                    <p className="text-xs tracking-wider text-muted uppercase">{formatDay(e.date)}</p>
                    <p className={cn(big ? 'font-serif text-2xl' : 'text-[15px] font-medium')}>
                      {e.type === 'plan' && <span className="text-muted">Plan cumplido · </span>}
                      {e.title}
                    </p>
                    {e.note && <p className="mt-1 text-sm text-ink-soft">{e.note}</p>}
                  </button>
                  {e.photo && (
                    <button
                      onClick={() => setViewing(e.photo)}
                      className={cn(
                        'mt-3 block overflow-hidden rounded-2xl bg-sand shadow-soft',
                        big ? 'aspect-[4/3] w-full max-w-sm' : 'size-20',
                      )}
                    >
                      <img src={e.photo.thumb} alt="" loading="lazy" className="size-full object-cover" />
                    </button>
                  )}
                </motion.div>
              </li>
            )
          })}
        </ol>
      )}

      <MilestoneSheet value={editing} onClose={() => setEditing(null)} />
      <PhotoViewer photos={viewing ? [viewing] : []} index={viewing ? 0 : -1} onClose={() => setViewing(null)} />
    </div>
  )
}

function MilestoneSheet({ value, onClose }: { value: Milestone | 'new' | null; onClose: () => void }) {
  const { photos, saveRow, removeRow, uploadPhotos } = useStore()
  const m = value && value !== 'new' ? value : null
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [photoId, setPhotoId] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (!value) return
    setTitle(m?.title ?? '')
    setDate(m?.date ?? todayISO())
    setNote(m?.note ?? '')
    setPhotoId(m?.photoId ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const photo = photos.find((p) => p.id === photoId)

  const save = () => {
    if (!title.trim() || !date) return
    saveRow('milestones', {
      id: m?.id ?? uid(),
      title: title.trim(),
      date,
      note: note.trim(),
      photoId,
      createdAt: m?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  return (
    <>
      <Sheet open={!!value} onClose={onClose} title={m ? 'Editar momento' : 'Nuevo momento'}>
        <div className="space-y-4">
          {!m && (
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} className={title === s ? 'chip-on' : 'chip-off'} onClick={() => setTitle(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <input className="field" placeholder="¿Qué pasó?" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
          <textarea
            className="field h-auto min-h-20 resize-none py-3"
            placeholder="Cuéntenlo (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {photo ? (
            <div className="relative w-40 overflow-hidden rounded-2xl">
              <img src={photo.thumb} alt="" className="aspect-[4/3] w-full object-cover" />
              <button
                className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/50 text-white"
                onClick={() => setPhotoId(null)}
                aria-label="Quitar foto"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button className="btn-outline" onClick={() => setPicking(true)}>
                <Images size={15} /> Del álbum
              </button>
              <UploadButton
                className="btn-outline"
                multiple={false}
                onFiles={async (f) => {
                  const [p] = await uploadPhotos(f)
                  if (p) setPhotoId(p.id)
                }}
              >
                <ImagePlus size={15} /> Subir
              </UploadButton>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-line pt-4">
            {m ? (
              <button className="btn-ghost -ml-3 text-accent" onClick={() => setConfirm(true)}>
                <Trash2 size={16} /> Eliminar
              </button>
            ) : (
              <span />
            )}
            <button className="btn-primary px-6" onClick={save} disabled={!title.trim() || !date}>
              Guardar
            </button>
          </div>
        </div>
      </Sheet>
      <PhotoPicker open={picking} onClose={() => setPicking(false)} nearDate={date} onPick={(p) => setPhotoId(p.id)} />
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title="¿Eliminar este momento?"
        onConfirm={() => {
          if (m) removeRow('milestones', m.id)
          onClose()
        }}
      />
    </>
  )
}
