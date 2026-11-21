import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { BookOpen } from 'lucide-react'
import { useStore } from '../../store'
import { PhotoViewer } from '../../components/PhotoViewer'
import { navigate } from '../../lib/route'
import { photoCoords } from '../../lib/geo'
import { SANTIAGO, cn, distanceKm, formatDay, photoDate } from '../../lib/utils'
import { placeAvg, Stars } from './PlacesView'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function useYears() {
  const { photos, activities, places, milestones } = useStore()
  return useMemo(() => {
    const ys = new Set<string>([String(new Date().getFullYear())])
    photos.forEach((p) => ys.add(photoDate(p).slice(0, 4)))
    activities.forEach((a) => a.doneAt && ys.add(a.doneAt.slice(0, 4)))
    places.forEach((p) => p.visitedAt && ys.add(p.visitedAt.slice(0, 4)))
    milestones.forEach((m) => ys.add(m.date.slice(0, 4)))
    return [...ys].sort().reverse()
  }, [photos, activities, places, milestones])
}

export function YearView() {
  const { photos, activities, places, milestones, settings } = useStore()
  const years = useYears()
  const [year, setYear] = useState(years[0])
  const [view, setView] = useState(-1)

  const data = useMemo(() => {
    const ph = photos.filter((p) => photoDate(p).startsWith(year))
    const acts = activities.filter((a) => a.done && a.doneAt?.startsWith(year)).sort((a, b) => a.doneAt!.localeCompare(b.doneAt!))
    const pl = places.filter((p) => p.visitedAt?.startsWith(year)).sort((a, b) => (placeAvg(b) ?? 0) - (placeAvg(a) ?? 0))
    const ms = milestones.filter((m) => m.date.startsWith(year))
    const perMonth = Array.from({ length: 12 }, (_, i) => ph.filter((p) => Number(photoDate(p).slice(5, 7)) === i + 1).length)
    const maxMonth = perMonth.indexOf(Math.max(...perMonth))
    const km = ph.reduce((m, p) => {
      const c = photoCoords(p, activities)
      return c ? Math.max(m, distanceKm(SANTIAGO, c)) : m
    }, 0)
    const daily = ph.filter((p) => p.dailyDate?.startsWith(year)).length
    // Collage: primero las del marco, luego el resto, repartidas en el año
    const pool = [...ph.filter((p) => p.inFrame), ...ph.filter((p) => !p.inFrame)]
    const step = Math.max(1, Math.floor(pool.length / 9))
    const collage = pool.filter((_, i) => i % step === 0).slice(0, 9)
    return { ph, acts, pl, ms, perMonth, maxMonth, km, daily, collage }
  }, [year, photos, activities, places, milestones])

  const peak = Math.max(...data.perMonth, 1)
  const names = [settings.nameA, settings.nameB].filter(Boolean).join(' & ')

  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {years.map((y) => (
          <button key={y} className={y === year ? 'chip-on' : 'chip-off'} onClick={() => setYear(y)}>
            {y}
          </button>
        ))}
      </div>

      <motion.div key={year} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mt-6 overflow-hidden rounded-[28px] bg-ink p-6 text-paper sm:p-10">
          <p className="text-xs tracking-[0.2em] text-paper/50 uppercase">Nuestro año</p>
          <p className="mt-2 font-serif text-6xl font-light sm:text-8xl">{year}</p>
          {names && <p className="mt-1 text-paper/70">{names}</p>}
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
            <Big n={data.ph.length} label="fotos" />
            <Big n={data.acts.length} label="planes cumplidos" />
            <Big n={data.pl.length} label="lugares nuevos" />
            <Big n={Math.round(data.km)} label="km al punto más lejano" />
          </div>
        </div>

        {data.ph.length > 0 && (
          <div className="card mt-4 p-5 sm:p-6">
            <p className="font-serif text-xl">
              Su mes con más recuerdos fue <span className="text-accent italic">{MONTHS_LONG[data.maxMonth]}</span>
            </p>
            <div className="mt-5 flex h-32 items-end gap-1.5 sm:gap-3">
              {data.perMonth.map((n, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10px] text-muted tabular-nums">{n || ''}</span>
                  <motion.div
                    className={cn('w-full rounded-md', i === data.maxMonth ? 'bg-accent' : 'bg-line')}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max((n / peak) * 96, n ? 4 : 2)}px` }}
                    transition={{ delay: i * 0.03, type: 'spring', damping: 24 }}
                  />
                  <span className="text-[10px] text-muted">{MONTHS[i]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.collage.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-1.5 overflow-hidden rounded-3xl">
            {data.collage.map((p) => (
              <button key={p.id} onClick={() => setView(data.collage.indexOf(p))} className="aspect-square bg-sand">
                <img src={p.thumb} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {data.acts.length > 0 && (
            <div className="card p-5">
              <p className="label">Planes cumplidos</p>
              <ul className="space-y-2">
                {data.acts.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3 text-sm">
                    <span>{a.title}</span>
                    <span className="shrink-0 text-muted">{formatDay(a.doneAt!)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(data.pl.length > 0 || data.ms.length > 0) && (
            <div className="card space-y-5 p-5">
              {data.pl.length > 0 && (
                <div>
                  <p className="label">Mejores lugares</p>
                  <ul className="space-y-2">
                    {data.pl.slice(0, 5).map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate">{p.name}</span>
                        <Stars value={placeAvg(p)} size={12} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.ms.length > 0 && (
                <div>
                  <p className="label">Momentos</p>
                  <ul className="space-y-2">
                    {data.ms.map((m) => (
                      <li key={m.id} className="flex justify-between gap-3 text-sm">
                        <span>{m.title}</span>
                        <span className="shrink-0 text-muted">{formatDay(m.date)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <button className="btn-outline mt-6" onClick={() => navigate('nosotros', 'libro')}>
          <BookOpen size={16} /> Convertir {year} en un libro
        </button>
      </motion.div>

      <PhotoViewer photos={data.collage} index={view} onClose={() => setView(-1)} />
    </div>
  )
}

function Big({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <p className="font-serif text-4xl tabular-nums sm:text-5xl">{n.toLocaleString('es-CL')}</p>
      <p className="text-xs text-paper/60">{label}</p>
    </div>
  )
}
