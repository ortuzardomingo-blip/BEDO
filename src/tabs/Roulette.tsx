import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ListPlus, Pencil, Plus, Shuffle } from 'lucide-react'
import { useStore } from '../store'
import { WheelIcon } from '../components/WheelIcon'
import { WheelSpinner } from './roulette/WheelSpinner'
import { WheelEditSheet } from './roulette/WheelEditSheet'
import { COMBO_WHEELS } from '../lib/seed'
import { celebrate } from '../lib/celebrate'
import type { Wheel } from '../lib/types'
import { placeAvg } from './us/PlacesView'
import { PageTitle } from '../components/Segmented'

const pick = (l: string[]) => l[Math.floor(Math.random() * l.length)]
const FAV_ID = '__favoritos'

export function Roulette() {
  const { wheels, places, addWheel, addActivity, toast } = useStore()
  const sorted = useMemo(() => {
    const list = wheels.slice().sort((a, b) => a.position - b.position)
    // Ruleta automática con los lugares mejor calificados (4★ o más)
    const fav = places.filter((p) => (placeAvg(p) ?? 0) >= 4).map((p) => p.name)
    if (fav.length >= 2) list.unshift({ id: FAV_ID, name: 'Favoritos', icon: 'heart', options: fav, position: -1 })
    return list
  }, [wheels, places])
  const [selId, setSelId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const wheel = sorted.find((w) => w.id === selId) ?? sorted[0]

  useEffect(() => setResult(null), [wheel?.id])

  const savePlan = (title: string) => {
    addActivity(title)
    toast(`“${title}” agregado a Planes`)
  }

  return (
    <section>
      <PageTitle title="Ruleta" subtitle="¿No saben qué hacer? Que decida la suerte." />

      <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {sorted.map((w) => (
          <button
            key={w.id}
            className={w.id === wheel?.id ? 'chip-on' : 'chip-off'}
            onClick={() => setSelId(w.id)}
          >
            <WheelIcon name={w.icon} size={15} />
            {w.name}
          </button>
        ))}
        <button
          className="chip-off border-dashed"
          onClick={() => {
            const w = addWheel('Nueva ruleta')
            setSelId(w.id)
            setEditId(w.id)
          }}
        >
          <Plus size={15} /> Nueva
        </button>
      </div>

      {wheel ? (
        <div className="mt-6 grid items-center gap-8 lg:grid-cols-[1fr_300px]">
          <div className="relative pt-2">
            <WheelSpinner
              key={wheel.id}
              options={wheel.options}
              onStart={() => setResult(null)}
              onResult={(v) => {
                setResult(v)
                celebrate()
              }}
            />
            {wheel.options.length < 2 && (
              <p className="mt-4 text-center text-sm text-muted">
                Agrega al menos 2 opciones para girar.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="card min-h-40 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.14em] text-muted">
                  {wheel.name} · {wheel.options.length} opciones
                </span>
                {wheel.id !== FAV_ID && (
                  <button className="btn-icon -mr-2 size-8" onClick={() => setEditId(wheel.id)} aria-label="Editar ruleta">
                    <Pencil size={15} />
                  </button>
                )}
              </div>
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div
                    key={result}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3"
                  >
                    <p className="text-sm text-muted">Salió</p>
                    <p className="font-serif text-3xl leading-tight">{result}</p>
                    <button className="btn-outline mt-4 h-9" onClick={() => savePlan(result)}>
                      <ListPlus size={15} /> Agregar a planes
                    </button>
                  </motion.div>
                ) : (
                  <motion.p
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 font-serif text-xl text-muted/70 italic"
                  >
                    Toquen “Girar”…
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-muted">Crea una ruleta para empezar.</p>
      )}

      <Combo wheels={sorted} onSave={savePlan} />

      <WheelEditSheet id={editId} onClose={() => setEditId(null)} />
    </section>
  )
}

/** Sortea varias ruletas a la vez: panorama + comida + postre */
function Combo({ wheels, onSave }: { wheels: Wheel[]; onSave: (t: string) => void }) {
  const chosen = useMemo(() => {
    const byName = COMBO_WHEELS.map((n) => wheels.find((w) => w.name === n)).filter(
      (w): w is Wheel => !!w && w.options.length > 0,
    )
    return (byName.length >= 2 ? byName : wheels.filter((w) => w.options.length).slice(0, 3)).slice(0, 3)
  }, [wheels])
  const [values, setValues] = useState<(string | null)[]>([])
  const [rolling, setRolling] = useState<boolean[]>([])
  const timers = useRef<ReturnType<typeof setInterval>[]>([])

  useEffect(() => () => timers.current.forEach(clearInterval), [])

  if (chosen.length < 2) return null

  const roll = () => {
    timers.current.forEach(clearInterval)
    timers.current = []
    setRolling(chosen.map(() => true))
    let left = chosen.length
    chosen.forEach((w, i) => {
      const start = Date.now()
      const stopAt = 900 + i * 450
      const t = setInterval(() => {
        setValues((v) => {
          const n = [...v]
          n[i] = pick(w.options)
          return n
        })
        if (Date.now() - start > stopAt) {
          clearInterval(t)
          setRolling((r) => {
            const n = [...r]
            n[i] = false
            return n
          })
          if (--left === 0) celebrate()
        }
      }, 70)
      timers.current.push(t)
    })
  }

  const busy = rolling.some(Boolean)
  const ready = values.length === chosen.length && values.every(Boolean) && !busy

  return (
    <div className="card mt-10 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-4 sm:px-6">
        <div>
          <h2 className="font-serif text-2xl">Plan sorpresa</h2>
          <p className="text-sm text-muted">Un panorama completo de una sola vez.</p>
        </div>
        <button className="btn-primary" onClick={roll} disabled={busy}>
          <Shuffle size={16} /> {values.length ? 'Otra vez' : 'Sortear'}
        </button>
      </div>
      <div className="grid divide-y divide-line/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {chosen.map((w, i) => (
          <div key={w.id} className="px-5 py-4 sm:px-6 sm:py-5">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-muted">
              <WheelIcon name={w.icon} size={13} /> {w.name}
            </p>
            <p
              className={
                'mt-1.5 truncate font-serif text-xl transition ' +
                (rolling[i] ? 'text-muted blur-[0.5px]' : values[i] ? 'text-ink' : 'text-muted/50')
              }
            >
              {values[i] ?? '—'}
            </p>
          </div>
        ))}
      </div>
      {ready && (
        <div className="flex justify-end border-t border-line/70 px-5 py-3 sm:px-6">
          <button
            className="btn-ghost -mr-3 h-9"
            onClick={() => onSave((values as string[]).join(' + '))}
          >
            <ListPlus size={15} /> Guardar como plan
          </button>
        </div>
      )}
    </div>
  )
}
