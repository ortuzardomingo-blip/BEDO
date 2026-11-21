import { useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, Check, ChefHat, ChevronDown, Film, Music, Plus, Shuffle, Tv, Utensils, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useStore } from '../../store'
import { cn, uid } from '../../lib/utils'

const LISTS: { id: string; label: string; icon: LucideIcon; doneLabel: string; placeholder: string }[] = [
  { id: 'peliculas', label: 'Películas', icon: Film, doneLabel: 'Vistas', placeholder: 'Agregar película…' },
  { id: 'series', label: 'Series', icon: Tv, doneLabel: 'Vistas', placeholder: 'Agregar serie…' },
  { id: 'restaurantes', label: 'Por comer', icon: Utensils, doneLabel: 'Probados', placeholder: 'Restaurante o comida…' },
  { id: 'recetas', label: 'Recetas', icon: ChefHat, doneLabel: 'Cocinadas', placeholder: 'Receta por cocinar…' },
  { id: 'libros', label: 'Libros', icon: BookOpen, doneLabel: 'Leídos', placeholder: 'Agregar libro…' },
  { id: 'musica', label: 'Música', icon: Music, doneLabel: 'Escuchados', placeholder: 'Disco, artista o concierto…' },
]

export function ListsView() {
  const { items, saveRow, patchRow, removeRow } = useStore()
  const [list, setList] = useState('peliculas')
  const [draft, setDraft] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const meta = LISTS.find((l) => l.id === list)!

  const mine = useMemo(() => items.filter((i) => i.list === list), [items, list])
  const pending = mine.filter((i) => !i.done).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const done = mine.filter((i) => i.done)

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    saveRow('items', { id: uid(), list, title: draft.trim(), note: '', done: false, createdAt: new Date().toISOString() })
    setDraft('')
  }

  const random = () => {
    if (!pending.length) return
    let n = 0
    const t = setInterval(() => {
      setPicked(pending[Math.floor(Math.random() * pending.length)].id)
      if (++n > 10) clearInterval(t)
    }, 80)
  }

  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {LISTS.map((l) => {
          const n = items.filter((i) => i.list === l.id && !i.done).length
          return (
            <button
              key={l.id}
              className={list === l.id ? 'chip-on' : 'chip-off'}
              onClick={() => {
                setList(l.id)
                setPicked(null)
              }}
            >
              <l.icon size={15} strokeWidth={1.75} /> {l.label}
              {n > 0 && <span className="tabular-nums opacity-60">{n}</span>}
            </button>
          )
        })}
      </div>

      <form onSubmit={add} className="mt-4 flex gap-2">
        <input className="field h-12 flex-1 rounded-full px-5" placeholder={meta.placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className="btn-primary size-12 shrink-0 p-0" disabled={!draft.trim()} aria-label="Agregar">
          <Plus size={18} />
        </button>
      </form>

      {pending.length > 1 && (
        <button className="btn-ghost mt-2 -ml-3" onClick={random}>
          <Shuffle size={15} /> ¿Cuál elegimos? Al azar
        </button>
      )}

      {pending.length ? (
        <ul className="card mt-3 divide-y divide-line/70 overflow-hidden">
          <AnimatePresence initial={false}>
            {pending.map((i) => (
              <motion.li
                key={i.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn('group flex items-center transition-colors', picked === i.id && 'bg-accent-soft')}
              >
                <button
                  className="grid size-13 shrink-0 place-items-center"
                  onClick={() => patchRow('items', i.id, { done: true })}
                  aria-label="Marcar como hecho"
                >
                  <span className="grid size-6 place-items-center rounded-full border-[1.5px] border-ink/25 text-transparent transition hover:border-accent hover:bg-accent-soft hover:text-accent">
                    <Check size={14} strokeWidth={2.5} />
                  </span>
                </button>
                <span className={cn('flex-1 py-3.5 text-[15px]', picked === i.id && 'font-medium')}>{i.title}</span>
                <button
                  className="btn-icon mr-1 size-9 text-muted opacity-60 transition hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={() => removeRow('items', i.id)}
                  aria-label="Eliminar"
                >
                  <X size={15} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="mt-8 text-center text-sm text-muted">La lista está vacía. ¡Agreguen algo!</p>
      )}

      {done.length > 0 && (
        <div className="mt-6">
          <button className="flex items-center gap-1.5 text-sm text-muted" onClick={() => setShowDone((v) => !v)}>
            <ChevronDown size={16} className={cn('transition', showDone && 'rotate-180')} />
            {meta.doneLabel} ({done.length})
          </button>
          {showDone && (
            <ul className="mt-2 space-y-1">
              {done.map((i) => (
                <li key={i.id} className="group flex items-center gap-2 text-sm text-muted">
                  <button
                    className="grid size-5 place-items-center rounded-full bg-ink/70 text-paper"
                    onClick={() => patchRow('items', i.id, { done: false })}
                    aria-label="Desmarcar"
                  >
                    <Check size={12} strokeWidth={3} />
                  </button>
                  <span className="flex-1 line-through decoration-muted/40">{i.title}</span>
                  <button className="opacity-0 transition group-hover:opacity-100" onClick={() => removeRow('items', i.id)} aria-label="Eliminar">
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
