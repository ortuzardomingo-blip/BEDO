import { useEffect, useMemo, useState } from 'react'
import { Cake, ChevronLeft, ChevronRight, Heart, ListChecks, Plane, Plus, Sparkles, Trash2, Wine } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useStore } from '../../store'
import { Confirm, Sheet } from '../../components/Sheet'
import { agendaBetween, KIND_LABEL, type AgendaItem } from '../../lib/agenda'
import type { CalEvent, EventKind } from '../../lib/types'
import { cn, daysUntil, formatLong, formatMonth, isoDate, todayISO, uid } from '../../lib/utils'
import { AddToCalendar } from './AddToCalendar'
import { ActivitySheet } from './ActivitySheet'

const WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export const KIND_ICON: Record<AgendaItem['kind'], LucideIcon> = {
  aniversario: Heart,
  cumpleanos: Cake,
  cita: Wine,
  viaje: Plane,
  otro: Sparkles,
  plan: ListChecks,
}

export function CalendarView() {
  const { events, activities, settings } = useStore()
  const today = todayISO()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [selected, setSelected] = useState(today)
  const [editing, setEditing] = useState<CalEvent | 'new' | null>(null)
  const [openAct, setOpenAct] = useState<string | null>(null)

  const [y, m] = month.split('-').map(Number)
  const first = isoDate(new Date(y, m - 1, 1))
  const last = isoDate(new Date(y, m, 0))
  const items = useMemo(
    () => agendaBetween(first, last, { events, activities, settings }),
    [first, last, events, activities, settings],
  )
  const upcoming = useMemo(() => {
    const end = isoDate(new Date(new Date().getFullYear() + 1, 11, 31))
    return agendaBetween(today, end, { events, activities, settings }).slice(0, 6)
  }, [today, events, activities, settings])

  const cells = useMemo(() => {
    const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7
    const days = new Date(y, m, 0).getDate()
    return [...Array<null>(offset).fill(null), ...Array.from({ length: days }, (_, i) => isoDate(new Date(y, m - 1, i + 1)))]
  }, [y, m])

  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1)
    setMonth(isoDate(d).slice(0, 7))
  }

  const dayItems = items.filter((i) => i.date === selected)
  const open = (it: AgendaItem) => {
    if (it.ref.type === 'event') setEditing(events.find((e) => e.id === it.ref.id) ?? null)
    else if (it.ref.type === 'activity') setOpenAct(it.ref.id)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button className="btn-icon" onClick={() => shift(-1)} aria-label="Mes anterior">
              <ChevronLeft size={18} />
            </button>
            <h2 className="min-w-44 text-center font-serif text-2xl">{formatMonth(first)}</h2>
            <button className="btn-icon" onClick={() => shift(1)} aria-label="Mes siguiente">
              <ChevronRight size={18} />
            </button>
          </div>
          <button className="btn-primary h-9" onClick={() => setEditing('new')}>
            <Plus size={16} /> Evento
          </button>
        </div>

        <div className="card mt-3 p-3 sm:p-5">
          <div className="grid grid-cols-7 gap-1">
            {WEEK.map((w, i) => (
              <p key={i} className="pb-2 text-center text-[11px] font-medium tracking-wider text-muted">
                {w}
              </p>
            ))}
            {cells.map((d, i) => {
              if (!d) return <span key={i} />
              const its = items.filter((x) => x.date === d)
              return (
                <button
                  key={d}
                  onClick={() => setSelected(d)}
                  className={cn(
                    'flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-sm tabular-nums transition sm:rounded-2xl',
                    d === selected ? 'bg-ink text-paper' : 'hover:bg-sand',
                    d === today && d !== selected && 'font-semibold text-accent',
                  )}
                >
                  {Number(d.slice(8))}
                  <span className="flex h-1.5 gap-0.5">
                    {its.slice(0, 3).map((x) => (
                      <span
                        key={x.key}
                        className={cn(
                          'size-1.5 rounded-full',
                          d === selected ? 'bg-paper' : x.kind === 'plan' ? 'bg-ink' : 'bg-accent',
                        )}
                      />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4">
          <p className="label">{formatLong(selected)}</p>
          {dayItems.length ? (
            <div className="space-y-2">
              {dayItems.map((it) => (
                <AgendaRow key={it.key} it={it} onClick={() => open(it)} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nada este día.</p>
          )}
        </div>
      </div>

      <aside>
        <p className="label">Próximamente</p>
        {upcoming.length ? (
          <div className="space-y-2">
            {upcoming.map((it) => (
              <AgendaRow key={it.key} it={it} onClick={() => open(it)} countdown />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-sand/60 p-4 text-sm text-muted">
            Agreguen cumpleaños, aniversarios o agenden un plan desde su ficha.
          </p>
        )}
      </aside>

      <EventSheet event={editing} defaultDate={selected} onClose={() => setEditing(null)} />
      <ActivitySheet id={openAct} onClose={() => setOpenAct(null)} />
    </div>
  )
}

export function AgendaRow({ it, onClick, countdown }: { it: AgendaItem; onClick?: () => void; countdown?: boolean }) {
  const Icon = KIND_ICON[it.kind]
  const n = daysUntil(it.date)
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-line/70 bg-card p-3 text-left transition hover:border-ink/25"
    >
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-xl',
          it.kind === 'plan' ? 'bg-sand text-ink' : 'bg-accent-soft text-accent',
        )}
      >
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{it.title}</span>
        <span className="block text-xs text-muted">
          {KIND_LABEL[it.kind]}
          {it.kind === 'cumpleanos' && it.years ? ` · cumple ${it.years}` : ''}
          {countdown && ` · ${formatLong(it.date)}`}
        </span>
      </span>
      {countdown && (
        <span className="shrink-0 text-right">
          <span className="block font-serif text-xl leading-none tabular-nums">{n === 0 ? 'Hoy' : n}</span>
          {n > 0 && <span className="text-[10px] text-muted uppercase">{n === 1 ? 'día' : 'días'}</span>}
        </span>
      )}
    </button>
  )
}

const KINDS: EventKind[] = ['cumpleanos', 'aniversario', 'cita', 'viaje', 'otro']

function EventSheet({
  event,
  defaultDate,
  onClose,
}: {
  event: CalEvent | 'new' | null
  defaultDate: string
  onClose: () => void
}) {
  const { saveRow, removeRow } = useStore()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [kind, setKind] = useState<EventKind>('otro')
  const [yearly, setYearly] = useState(false)
  const [note, setNote] = useState('')
  const [confirm, setConfirm] = useState(false)
  const isNew = event === 'new'
  const ev = event && event !== 'new' ? event : null

  useEffect(() => {
    if (!event) return
    setTitle(ev?.title ?? '')
    setDate(ev?.date ?? defaultDate)
    setKind(ev?.kind ?? 'otro')
    setYearly(ev?.yearly ?? false)
    setNote(ev?.note ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event])

  const save = () => {
    if (!title.trim() || !date) return
    saveRow('events', {
      id: ev?.id ?? uid(),
      title: title.trim(),
      date,
      kind,
      yearly,
      note: note.trim(),
      createdAt: ev?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  return (
    <>
      <Sheet open={!!event} onClose={onClose} title={isNew ? 'Nuevo evento' : 'Editar evento'}>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => {
              const I = KIND_ICON[k]
              return (
                <button
                  key={k}
                  className={kind === k ? 'chip-on' : 'chip-off'}
                  onClick={() => {
                    setKind(k)
                    if (k === 'cumpleanos' || k === 'aniversario') setYearly(true)
                  }}
                >
                  <I size={14} /> {KIND_LABEL[k]}
                </button>
              )
            })}
          </div>
          <div>
            <label className="label" htmlFor="et">
              Título
            </label>
            <input
              id="et"
              className="field"
              placeholder={kind === 'cumpleanos' ? 'Cumpleaños de…' : 'Ej: Matrimonio de la Jose'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <div>
              <label className="label" htmlFor="ed">
                {kind === 'cumpleanos' ? 'Fecha de nacimiento' : 'Fecha'}
              </label>
              <input id="ed" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <button
              onClick={() => setYearly((v) => !v)}
              className={cn('chip h-11 rounded-xl', yearly ? 'border-ink bg-ink text-paper' : 'border-line text-ink-soft')}
            >
              Cada año
            </button>
          </div>
          <div>
            <label className="label" htmlFor="en">
              Nota
            </label>
            <input id="en" className="field" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {ev && <AddToCalendar title={ev.title} date={ev.date} details={ev.note} yearly={ev.yearly} />}
          <div className="flex items-center justify-between border-t border-line pt-4">
            {ev ? (
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
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title="¿Eliminar este evento?"
        onConfirm={() => {
          if (ev) removeRow('events', ev.id)
          onClose()
        }}
      />
    </>
  )
}
