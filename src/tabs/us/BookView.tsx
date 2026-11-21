import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BookOpen, Loader2, Printer, X } from 'lucide-react'
import { useStore } from '../../store'
import type { Activity, Photo } from '../../lib/types'
import { formatDay, formatMonth, photoDate } from '../../lib/utils'
import { useYears } from './YearView'

type Scope = 'year' | 'plan' | 'all'

interface Chapter {
  title: string
  subtitle?: string
  note?: string
  photos: Photo[]
}

export function BookView() {
  const { activities, photos } = useStore()
  const years = useYears()
  const [scope, setScope] = useState<Scope>('year')
  const [year, setYear] = useState(years[0])
  const [planId, setPlanId] = useState('')
  const [notes, setNotes] = useState(true)
  const [open, setOpen] = useState(false)

  const donePlans = activities.filter((a) => a.done && photos.some((p) => p.activityId === a.id))

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_280px]">
      <div className="card space-y-5 p-5 sm:p-6">
        <div>
          <p className="label">¿Qué quieren imprimir?</p>
          <div className="flex flex-wrap gap-2">
            <button className={scope === 'year' ? 'chip-on' : 'chip-off'} onClick={() => setScope('year')}>
              Un año
            </button>
            <button className={scope === 'plan' ? 'chip-on' : 'chip-off'} onClick={() => setScope('plan')}>
              Un plan o viaje
            </button>
            <button className={scope === 'all' ? 'chip-on' : 'chip-off'} onClick={() => setScope('all')}>
              Toda nuestra historia
            </button>
          </div>
        </div>
        {scope === 'year' && (
          <div className="flex flex-wrap gap-2">
            {years.map((y) => (
              <button key={y} className={y === year ? 'chip-on' : 'chip-off'} onClick={() => setYear(y)}>
                {y}
              </button>
            ))}
          </div>
        )}
        {scope === 'plan' &&
          (donePlans.length ? (
            <select className="field appearance-none" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">Elegir plan…</option>
              {donePlans.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-muted">Aún no hay planes cumplidos con fotos.</p>
          ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notes} onChange={(e) => setNotes(e.target.checked)} className="size-4 accent-[#1d1b19]" />
          Incluir notas y descripciones
        </label>
        <button className="btn-primary h-12 w-full" disabled={scope === 'plan' && !planId} onClick={() => setOpen(true)}>
          <BookOpen size={17} /> Crear libro
        </button>
      </div>
      <div className="rounded-3xl bg-sand/60 p-5 text-sm leading-relaxed text-ink-soft">
        <p className="font-serif text-xl text-ink">Cómo funciona</p>
        <p className="mt-2">
          Se arma un fotolibro con portada, capítulos y sus fotos. Luego presionen <b className="font-medium">Imprimir</b>{' '}
          y elijan <b className="font-medium">“Guardar como PDF”</b> para tenerlo en el celular, enviarlo a una imprenta o
          regalarlo.
        </p>
        <p className="mt-2 text-muted">Funciona mejor desde el computador.</p>
      </div>

      {open && <BookPreview scope={scope} year={year} planId={planId} notes={notes} onClose={() => setOpen(false)} />}
    </div>
  )
}

function BookPreview({
  scope,
  year,
  planId,
  notes,
  onClose,
}: {
  scope: Scope
  year: string
  planId: string
  notes: boolean
  onClose: () => void
}) {
  const { photos, activities, settings, milestones } = useStore()
  const [printing, setPrinting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const names = [settings.nameA, settings.nameB].filter(Boolean).join(' & ')

  const book = useMemo(() => {
    const sorted = photos.slice().sort((a, b) => photoDate(a).localeCompare(photoDate(b)))
    const actOf = (id: string | null) => activities.find((a) => a.id === id)
    if (scope === 'plan') {
      const a = activities.find((x) => x.id === planId) as Activity
      const ps = sorted.filter((p) => p.activityId === planId)
      return {
        title: a.title,
        subtitle: a.doneAt ? formatDay(a.doneAt) : '',
        cover: ps.find((p) => p.inFrame) ?? ps[0],
        chapters: [{ title: a.title, subtitle: a.placeName, note: a.note, photos: ps }] as Chapter[],
      }
    }
    const ps = scope === 'year' ? sorted.filter((p) => photoDate(p).startsWith(year)) : sorted
    // Un capítulo por mes; las fotos de planes forman su propio capítulo
    const chapters: Chapter[] = []
    const byKey = new Map<string, Chapter>()
    for (const p of ps) {
      const act = actOf(p.activityId)
      const key = act ? `plan-${act.id}` : photoDate(p).slice(0, 7)
      let c = byKey.get(key)
      if (!c) {
        c = act
          ? { title: act.title, subtitle: act.doneAt ? formatDay(act.doneAt) : undefined, note: act.note, photos: [] }
          : { title: formatMonth(key + '-01'), photos: [] }
        byKey.set(key, c)
        chapters.push(c)
      }
      c.photos.push(p)
    }
    const ms = milestones.filter((m) => scope === 'all' || m.date.startsWith(year))
    return {
      title: scope === 'year' ? `Nuestro ${year}` : settings.title || 'Nuestra historia',
      subtitle: names,
      cover: ps.find((p) => p.inFrame) ?? ps[Math.floor(ps.length / 2)],
      chapters,
      milestones: ms.sort((a, b) => a.date.localeCompare(b.date)),
    }
  }, [scope, year, planId, photos, activities, milestones, settings.title, names])

  useEffect(() => {
    document.body.classList.add('book-open')
    return () => document.body.classList.remove('book-open')
  }, [])

  const print = async () => {
    setPrinting(true)
    const imgs = [...(ref.current?.querySelectorAll('img') ?? [])]
    await Promise.all(imgs.map((i) => (i.complete ? null : i.decode().catch(() => null))))
    setPrinting(false)
    window.print()
  }

  const big = book.chapters.reduce((n, c) => n + c.photos.length, 0) <= 120

  return createPortal(
    <div className="book-root fixed inset-0 z-[5000] overflow-y-auto bg-[#e9e4dc]">
      <div className="book-toolbar sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur">
        <p className="truncate font-serif text-lg">{book.title}</p>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={print} disabled={printing}>
            {printing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} Imprimir / PDF
          </button>
          <button className="btn-icon" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
      </div>

      <div ref={ref} className="book mx-auto max-w-[210mm] space-y-6 py-6">
        {/* Portada */}
        <section className="book-page flex flex-col items-center justify-center bg-[#fffdfa] p-[14mm] text-center">
          {book.cover && (
            <img src={big ? book.cover.src : book.cover.thumb} alt="" className="mb-10 max-h-[150mm] w-[120mm] rounded-sm object-cover" />
          )}
          <p className="font-serif text-5xl font-light">{book.title}</p>
          {book.subtitle && <p className="mt-3 text-sm tracking-[0.2em] text-muted uppercase">{book.subtitle}</p>}
        </section>

        {'milestones' in book && book.milestones && book.milestones.length > 0 && (
          <section className="book-page bg-[#fffdfa] p-[18mm]">
            <p className="font-serif text-3xl">Nuestros momentos</p>
            <ul className="mt-8 space-y-5">
              {book.milestones.map((m) => (
                <li key={m.id}>
                  <p className="text-xs tracking-wider text-muted uppercase">{formatDay(m.date)}</p>
                  <p className="font-serif text-xl">{m.title}</p>
                  {notes && m.note && <p className="text-sm text-ink-soft">{m.note}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {book.chapters.map((c, ci) =>
          chunk(c.photos, 4).map((group, gi) => (
            <section key={`${ci}-${gi}`} className="book-page bg-[#fffdfa] p-[14mm]">
              {gi === 0 && (
                <header className="mb-6">
                  <p className="font-serif text-3xl">{c.title}</p>
                  {c.subtitle && <p className="text-sm text-muted">{c.subtitle}</p>}
                  {notes && c.note && <p className="mt-2 text-sm text-ink-soft italic">“{c.note}”</p>}
                </header>
              )}
              <div className={group.length === 1 ? 'grid' : 'grid grid-cols-2 gap-[5mm]'}>
                {group.map((p) => (
                  <figure key={p.id} className="break-inside-avoid">
                    <img
                      src={big ? p.src : p.thumb}
                      alt=""
                      className={group.length === 1 ? 'max-h-[200mm] w-full object-contain' : 'aspect-[4/5] w-full object-cover'}
                    />
                    {notes && p.caption && <figcaption className="mt-1.5 text-xs text-ink-soft">{p.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </section>
          )),
        )}

        <section className="book-page flex flex-col items-center justify-center bg-[#fffdfa] p-[14mm] text-center">
          <p className="font-serif text-3xl italic">Continuará…</p>
          {names && <p className="mt-3 text-sm text-muted">{names}</p>}
        </section>
      </div>
    </div>,
    document.body,
  )
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}
