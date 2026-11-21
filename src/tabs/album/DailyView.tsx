import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Flame, Play } from 'lucide-react'
import { useStore } from '../../store'
import { Sheet } from '../../components/Sheet'
import { PhotoViewer } from '../../components/PhotoViewer'
import { DailyPair } from '../../components/DailyPair'
import { cn, dailyStreak, formatLong, formatMonth, isoDate, todayISO } from '../../lib/utils'
import { isDailyOnly, type DailyWho, type Photo } from '../../lib/types'

const WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function DailyView() {
  const { allPhotos: photos, settings, moveToDaily, toast } = useStore()
  const [moving, setMoving] = useState(false)
  // Fotos del día subidas antes de que el diario fuera aparte (siguen en el álbum)
  const legacy = photos.filter((p) => p.dailyDate && !isDailyOnly(p))
  const today = todayISO()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [day, setDay] = useState<string | null>(null)
  const [view, setView] = useState<{ list: Photo[]; i: number; auto?: boolean } | null>(null)

  // fecha → { a, b }
  const byDate = useMemo(() => {
    const m = new Map<string, Partial<Record<DailyWho, Photo>>>()
    for (const p of photos)
      if (p.dailyDate && p.dailyWho) m.set(p.dailyDate, { ...m.get(p.dailyDate), [p.dailyWho]: p })
    return m
  }, [photos])
  const streak = dailyStreak(new Set(byDate.keys()))

  const cells = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7 // lunes primero
    const days = new Date(y, m, 0).getDate()
    return [
      ...Array<null>(offset).fill(null),
      ...Array.from({ length: days }, (_, i) => isoDate(new Date(y, m - 1, i + 1))),
    ]
  }, [month])

  const monthDays = cells.filter((d): d is string => !!d && byDate.has(d))
  const monthPhotos = monthDays.flatMap((d) => [byDate.get(d)!.a, byDate.get(d)!.b].filter((p): p is Photo => !!p))

  const shift = (n: number) => {
    const [y, m] = month.split('-').map(Number)
    setMonth(isoDate(new Date(y, m - 1 + n, 1)).slice(0, 7))
  }

  const names = [settings.nameA || 'Uno', settings.nameB || 'Otro']

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button className="btn-icon" onClick={() => shift(-1)} aria-label="Mes anterior">
            <ChevronLeft size={18} />
          </button>
          <h2 className="min-w-44 text-center font-serif text-2xl">{formatMonth(month + '-01')}</h2>
          <button className="btn-icon" onClick={() => shift(1)} disabled={month >= today.slice(0, 7)} aria-label="Mes siguiente">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <span className="chip border-accent/30 bg-accent-soft text-accent">
              <Flame size={14} /> {streak} {streak === 1 ? 'día' : 'días'} seguidos
            </span>
          )}
          <button
            className="btn-outline h-9"
            disabled={!monthPhotos.length}
            onClick={() => setView({ list: monthPhotos, i: 0, auto: true })}
          >
            <Play size={14} /> Ver el mes
          </button>
        </div>
      </div>

      <div className="card mx-auto mt-4 max-w-2xl p-3 sm:p-5">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {WEEK.map((w, i) => (
            <p key={i} className="pb-1 text-center text-[11px] font-medium tracking-wider text-muted">
              {w}
            </p>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={i} />
            const pair = byDate.get(d)
            const shown = pair ? [pair.a, pair.b].filter((p): p is Photo => !!p) : []
            const future = d > today
            return (
              <button
                key={d}
                disabled={future}
                onClick={() => setDay(d)}
                className={cn(
                  'relative flex aspect-square overflow-hidden rounded-xl text-xs transition sm:rounded-2xl',
                  shown.length ? 'gap-px bg-sand' : 'border border-dashed border-line hover:border-ink/30',
                  future && 'opacity-30',
                  d === today && 'ring-2 ring-accent ring-offset-2 ring-offset-card',
                )}
              >
                {shown.map((p) => (
                  <img key={p.id} src={p.thumb} alt="" loading="lazy" className="h-full min-w-0 flex-1 object-cover" />
                ))}
                <span
                  className={cn(
                    'absolute top-1 left-1.5 tabular-nums sm:top-1.5 sm:left-2',
                    shown.length ? 'font-medium text-white drop-shadow' : 'text-muted',
                  )}
                >
                  {Number(d.slice(8))}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <p className="mt-3 text-center text-sm text-muted">
        {monthDays.length} de {cells.filter(Boolean).length} días con foto · una de {names[0]} y una de {names[1]} cada día
      </p>

      {legacy.length > 0 && (
        <div className="mx-auto mt-5 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-sand/60 p-4 text-sm">
          <p className="flex-1 text-ink-soft">
            {legacy.length === 1 ? 'Hay 1 foto del día' : `Hay ${legacy.length} fotos del día`} que también
            aparece{legacy.length === 1 ? '' : 'n'} en el álbum (se subieron antes de este cambio).
          </p>
          <button
            className="btn-outline h-9"
            disabled={moving}
            onClick={async () => {
              setMoving(true)
              const n = await moveToDaily(legacy.map((p) => p.id))
              setMoving(false)
              if (n) toast(n === 1 ? 'Foto movida al diario' : `${n} fotos movidas al diario`)
            }}
          >
            {moving ? 'Moviendo…' : 'Dejarlas solo en el diario'}
          </button>
        </div>
      )}

      <Sheet open={!!day} onClose={() => setDay(null)} title={day ? formatLong(day) : ''} subtitle="La foto de cada uno este día">
        {day && <DailyPair date={day} />}
      </Sheet>
      <PhotoViewer photos={view?.list ?? []} index={view ? view.i : -1} autoplay={view?.auto} onClose={() => setView(null)} />
    </div>
  )
}
