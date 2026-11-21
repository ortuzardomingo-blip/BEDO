import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Minus, PiggyBank, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../../store'
import { Confirm, Sheet } from '../../components/Sheet'
import type { Goal } from '../../lib/types'
import { cn, formatCLP, formatDay, todayISO, uid } from '../../lib/utils'
import { celebrate } from '../../lib/celebrate'

export const goalSaved = (g: Goal) => g.entries.reduce((s, e) => s + e.amount, 0)

const parseAmount = (s: string) => Number(s.replace(/\D/g, '')) || 0
const fmtInput = (s: string) => {
  const n = parseAmount(s)
  return n ? n.toLocaleString('es-CL') : ''
}

export function GoalsView() {
  const { goals, activities } = useStore()
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const total = goals.reduce((s, g) => s + goalSaved(g), 0)
  const sorted = goals.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label mb-0">Ahorrado en total</p>
          <p className="font-serif text-4xl tabular-nums">{formatCLP(total)}</p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> Nueva meta
        </button>
      </div>

      {sorted.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {sorted.map((g) => {
            const saved = goalSaved(g)
            const pct = g.target ? Math.min(100, Math.round((saved / g.target) * 100)) : 0
            const act = activities.find((a) => a.id === g.activityId)
            const done = g.target > 0 && saved >= g.target
            return (
              <button
                key={g.id}
                onClick={() => setOpenId(g.id)}
                className="card p-5 text-left transition hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-serif text-xl">{g.title}</p>
                    {act && <p className="truncate text-xs text-muted">Para: {act.title}</p>}
                  </div>
                  {done ? (
                    <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs text-white">
                      ¡Listo para ir!
                    </span>
                  ) : (
                    <span className="shrink-0 font-serif text-lg text-muted tabular-nums">{pct}%</span>
                  )}
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
                  <motion.div
                    className="h-full rounded-full bg-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: 'spring', damping: 30 }}
                  />
                </div>
                <p className="mt-2 text-sm tabular-nums">
                  {formatCLP(saved)} <span className="text-muted">de {formatCLP(g.target)}</span>
                </p>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-line p-8 text-center">
          <PiggyBank size={30} strokeWidth={1.25} className="mx-auto text-muted" />
          <p className="mt-2 font-serif text-xl">Su alcancía está vacía</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Creen una meta para un plan grande, como Torres del Paine o el buceo, y vayan anotando lo que
            ahorran.
          </p>
        </div>
      )}

      <GoalSheet id={openId} creating={creating} onClose={() => (setOpenId(null), setCreating(false))} />
    </div>
  )
}

function GoalSheet({ id, creating, onClose }: { id: string | null; creating: boolean; onClose: () => void }) {
  const { goals, activities, saveRow, removeRow } = useStore()
  const goal = goals.find((g) => g.id === id) ?? null
  const open = creating || !!goal
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [activityId, setActivityId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [withdraw, setWithdraw] = useState(false)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(goal?.title ?? '')
    setTarget(goal ? goal.target.toLocaleString('es-CL') : '')
    setActivityId(goal?.activityId ?? '')
    setAmount('')
    setNote('')
    setWithdraw(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, goal?.id])

  const pending = activities.filter((a) => !a.done)

  const saveGoal = () => {
    if (!title.trim()) return
    saveRow('goals', {
      id: goal?.id ?? uid(),
      title: title.trim(),
      target: parseAmount(target),
      activityId: activityId || null,
      entries: goal?.entries ?? [],
      createdAt: goal?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  const addEntry = () => {
    if (!goal) return
    const n = parseAmount(amount)
    if (!n) return
    const before = goalSaved(goal)
    const entry = { id: uid(), amount: withdraw ? -n : n, date: todayISO(), note: note.trim() }
    saveRow('goals', { ...goal, entries: [...goal.entries, entry] })
    if (!withdraw && goal.target && before < goal.target && before + n >= goal.target) celebrate()
    setAmount('')
    setNote('')
  }

  const saved = goal ? goalSaved(goal) : 0

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={goal ? goal.title : 'Nueva meta'}
        subtitle={goal ? `${formatCLP(saved)} de ${formatCLP(goal.target)}` : 'Para qué están ahorrando'}
      >
        <div className="space-y-5">
          {goal && (
            <div className="rounded-2xl bg-sand/60 p-4">
              <div className="mb-3 flex gap-1.5">
                <button className={!withdraw ? 'chip-on' : 'chip-off'} onClick={() => setWithdraw(false)}>
                  <Plus size={14} /> Abonar
                </button>
                <button className={withdraw ? 'chip-on' : 'chip-off'} onClick={() => setWithdraw(true)}>
                  <Minus size={14} /> Retirar
                </button>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">$</span>
                  <input
                    className="field pl-7"
                    inputMode="numeric"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(fmtInput(e.target.value))}
                  />
                </div>
                <button className="btn-primary h-11 shrink-0" onClick={addEntry} disabled={!parseAmount(amount)}>
                  Guardar
                </button>
              </div>
              <input
                className="field mt-2"
                placeholder="Nota (opcional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}

          {goal && goal.entries.length > 0 && (
            <div>
              <p className="label">Movimientos</p>
              <ul className="divide-y divide-line/70 rounded-2xl border border-line/70">
                {goal.entries
                  .slice()
                  .reverse()
                  .map((e) => (
                    <li key={e.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                      <span className="flex-1 text-muted">
                        {formatDay(e.date)}
                        {e.note && <span className="text-ink-soft"> · {e.note}</span>}
                      </span>
                      <span className={cn('tabular-nums', e.amount < 0 ? 'text-accent' : 'text-ink')}>
                        {e.amount < 0 ? '−' : '+'}
                        {formatCLP(Math.abs(e.amount))}
                      </span>
                      <button
                        className="text-muted transition hover:text-accent"
                        aria-label="Borrar movimiento"
                        onClick={() => saveRow('goals', { ...goal, entries: goal.entries.filter((x) => x.id !== e.id) })}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            {goal && <p className="label mb-0">Ajustes de la meta</p>}
            <input className="field" placeholder="Ej: Torres del Paine" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">$</span>
              <input
                className="field pl-7"
                inputMode="numeric"
                placeholder="Meta (ej: 600.000)"
                value={target}
                onChange={(e) => setTarget(fmtInput(e.target.value))}
              />
            </div>
            <select className="field appearance-none" value={activityId} onChange={(e) => setActivityId(e.target.value)}>
              <option value="">Sin plan asociado</option>
              {pending.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between border-t border-line pt-4">
            {goal ? (
              <button className="btn-ghost -ml-3 text-accent" onClick={() => setConfirm(true)}>
                <Trash2 size={16} /> Eliminar
              </button>
            ) : (
              <span />
            )}
            <button className="btn-primary px-6" onClick={saveGoal} disabled={!title.trim()}>
              {goal ? 'Listo' : 'Crear meta'}
            </button>
          </div>
        </div>
      </Sheet>
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title="¿Eliminar esta meta?"
        text="Se borrará con todos sus movimientos."
        onConfirm={() => {
          if (goal) removeRow('goals', goal.id)
          onClose()
        }}
      />
    </>
  )
}
