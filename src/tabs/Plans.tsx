import { useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, Check, ChevronRight, Plus } from 'lucide-react'
import { useStore } from '../store'
import type { Activity } from '../lib/types'
import { formatDay } from '../lib/utils'
import { CompleteSheet } from './plans/CompleteSheet'
import { ActivitySheet } from './plans/ActivitySheet'

type View = 'todo' | 'done'

export function Plans() {
  const { activities, photos, addActivity } = useStore()
  const [view, setView] = useState<View>('todo')
  const [draft, setDraft] = useState('')
  const [completing, setCompleting] = useState<Activity | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const pending = useMemo(
    () => activities.filter((a) => !a.done).sort((a, b) => a.position - b.position),
    [activities],
  )
  const done = useMemo(
    () =>
      activities
        .filter((a) => a.done)
        .sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')),
    [activities],
  )
  const photosOf = (id: string) => photos.filter((p) => p.activityId === id)

  const total = activities.length
  const pct = total ? Math.round((done.length / total) * 100) : 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    addActivity(draft)
    setDraft('')
    setView('todo')
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-serif text-4xl font-light tracking-tight sm:text-5xl">Planes</h1>
          <p className="mt-1 text-sm text-muted">Todo lo que queremos hacer juntos.</p>
        </div>
        <div className="w-full sm:w-64">
          <div className="flex items-baseline justify-between">
            <span className="font-serif text-3xl tabular-nums">
              {done.length}
              <span className="text-muted/60">/{total}</span>
            </span>
            <span className="text-xs uppercase tracking-[0.14em] text-muted">{pct}% cumplido</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', damping: 30 }}
            />
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="mt-7 flex gap-2">
        <input
          className="field h-12 flex-1 rounded-full px-5"
          placeholder="Agregar un plan nuevo…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn-primary size-12 shrink-0 p-0 sm:w-auto sm:px-5" disabled={!draft.trim()}>
          <Plus size={18} />
          <span className="hidden sm:inline">Agregar</span>
        </button>
      </form>

      <div className="mt-5 flex gap-2">
        <button className={view === 'todo' ? 'chip-on' : 'chip-off'} onClick={() => setView('todo')}>
          Por hacer <span className="tabular-nums opacity-60">{pending.length}</span>
        </button>
        <button className={view === 'done' ? 'chip-on' : 'chip-off'} onClick={() => setView('done')}>
          Cumplidos <span className="tabular-nums opacity-60">{done.length}</span>
        </button>
      </div>

      {view === 'todo' ? (
        pending.length ? (
          <ul className="card mt-4 divide-y divide-line/70 overflow-hidden">
            <AnimatePresence initial={false}>
              {pending.map((a) => (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="group flex items-center gap-1"
                >
                  <button
                    onClick={() => setCompleting(a)}
                    className="grid size-14 shrink-0 place-items-center"
                    aria-label={`Marcar ${a.title} como cumplido`}
                  >
                    <span className="grid size-6 place-items-center rounded-full border-[1.5px] border-ink/25 text-transparent transition group-hover:border-ink/50 hover:!border-accent hover:bg-accent-soft hover:!text-accent">
                      <Check size={14} strokeWidth={2.5} />
                    </span>
                  </button>
                  <button
                    onClick={() => setOpenId(a.id)}
                    className="flex min-h-14 flex-1 items-center gap-2 py-3 pr-4 text-left"
                  >
                    <span className="flex-1 text-[15px]">{a.title}</span>
                    <ChevronRight
                      size={16}
                      className="text-muted/50 opacity-0 transition group-hover:opacity-100"
                    />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <div className="mt-12 text-center">
            <p className="font-serif text-2xl">¡Cumplieron todo!</p>
            <p className="mt-1 text-sm text-muted">Agreguen nuevos planes arriba.</p>
          </div>
        )
      ) : done.length ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {done.map((a) => {
            const ps = photosOf(a.id)
            const cover = ps[0]
            return (
              <motion.button
                key={a.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setOpenId(a.id)}
                className="group overflow-hidden rounded-3xl border border-line/70 bg-card text-left shadow-soft transition hover:shadow-lift"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-sand">
                  {cover ? (
                    <img
                      src={cover.thumb}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-muted/60">
                      <span className="flex flex-col items-center gap-1.5 text-xs">
                        <Camera size={22} strokeWidth={1.25} />
                        Agregar fotos
                      </span>
                    </div>
                  )}
                  {ps.length > 1 && (
                    <span className="absolute top-2.5 right-2.5 rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white backdrop-blur">
                      {ps.length} fotos
                    </span>
                  )}
                  <span className="absolute top-2.5 left-2.5 grid size-6 place-items-center rounded-full bg-accent text-white">
                    <Check size={13} strokeWidth={2.75} />
                  </span>
                </div>
                <div className="p-3.5">
                  <p className="truncate font-medium">{a.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{a.doneAt && formatDay(a.doneAt)}</p>
                </div>
              </motion.button>
            )
          })}
        </div>
      ) : (
        <div className="mt-12 text-center">
          <p className="font-serif text-2xl">Aún nada por aquí</p>
          <p className="mt-1 text-sm text-muted">
            Toquen el círculo de un plan cuando lo cumplan para guardar el recuerdo.
          </p>
        </div>
      )}

      <CompleteSheet activity={completing} onClose={() => setCompleting(null)} />
      <ActivitySheet id={openId} onClose={() => setOpenId(null)} />
    </section>
  )
}
