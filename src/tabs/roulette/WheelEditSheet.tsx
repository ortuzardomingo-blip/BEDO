import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { Confirm, Sheet } from '../../components/Sheet'
import { WHEEL_ICONS, WheelIcon } from '../../components/WheelIcon'
import { useStore } from '../../store'
import { cn } from '../../lib/utils'

export function WheelEditSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { wheels, updateWheel, deleteWheel } = useStore()
  const wheel = wheels.find((w) => w.id === id) ?? null
  const [name, setName] = useState('')
  const [draft, setDraft] = useState('')
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (wheel) setName(wheel.name)
    setDraft('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wheel?.id])

  const saveName = () => {
    if (wheel && name.trim() && name.trim() !== wheel.name) updateWheel(wheel.id, { name: name.trim() })
  }

  const add = (e: FormEvent) => {
    e.preventDefault()
    const v = draft.trim()
    if (!wheel || !v) return
    if (!wheel.options.includes(v)) updateWheel(wheel.id, { options: [...wheel.options, v] })
    setDraft('')
  }

  const close = () => {
    saveName()
    onClose()
  }

  return (
    <>
      <Sheet open={!!wheel} onClose={close} title="Editar ruleta" subtitle="Los cambios se guardan al instante.">
        {wheel && (
          <div className="space-y-5">
            <div>
              <label className="label" htmlFor="wn">
                Nombre
              </label>
              <input
                id="wn"
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveName}
              />
            </div>
            <div>
              <span className="label">Ícono</span>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(WHEEL_ICONS).map((k) => (
                  <button
                    key={k}
                    onClick={() => updateWheel(wheel.id, { icon: k })}
                    className={cn(
                      'grid size-10 place-items-center rounded-xl border transition',
                      wheel.icon === k
                        ? 'border-ink bg-ink text-paper'
                        : 'border-line text-ink-soft hover:border-ink/30',
                    )}
                    aria-label={k}
                  >
                    <WheelIcon name={k} size={17} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="label">Opciones · {wheel.options.length}</span>
              <form onSubmit={add} className="flex gap-2">
                <input
                  className="field"
                  placeholder="Nueva opción…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button className="btn-primary size-11 shrink-0 p-0" disabled={!draft.trim()} aria-label="Agregar">
                  <Plus size={18} />
                </button>
              </form>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {wheel.options.map((o) => (
                  <span
                    key={o}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-paper py-1 pr-1 pl-3 text-sm"
                  >
                    {o}
                    <button
                      className="grid size-6 place-items-center rounded-full text-muted transition hover:bg-sand hover:text-ink"
                      onClick={() =>
                        updateWheel(wheel.id, { options: wheel.options.filter((x) => x !== o) })
                      }
                      aria-label={`Quitar ${o}`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-4">
              <button className="btn-ghost -ml-3 text-accent" onClick={() => setConfirm(true)}>
                <Trash2 size={16} /> Eliminar ruleta
              </button>
              <button className="btn-primary px-6" onClick={close}>
                Listo
              </button>
            </div>
          </div>
        )}
      </Sheet>
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`¿Eliminar la ruleta “${wheel?.name ?? ''}”?`}
        onConfirm={() => {
          if (wheel) deleteWheel(wheel.id)
          onClose()
        }}
      />
    </>
  )
}
