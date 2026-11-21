import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, MapPin, Plus, Star, Trash2 } from 'lucide-react'
import { useStore } from '../../store'
import { Confirm, Sheet } from '../../components/Sheet'
import { LocationPicker, type PickedLocation } from '../../components/map/LocationPicker'
import { navigate } from '../../lib/route'
import type { Place } from '../../lib/types'
import { cn, formatDay, uid } from '../../lib/utils'

export const PLACE_KINDS = ['restaurante', 'café', 'bar', 'heladería', 'mirador', 'parque', 'panorama', 'otro']

export const placeAvg = (p: Place) => {
  const v = [p.ratingA, p.ratingB].filter((x): x is number => x != null)
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null
}

export function Stars({ value, size = 14 }: { value: number | null; size?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={1.5}
          className={value != null && i <= Math.round(value) ? 'fill-accent text-accent' : 'text-line'}
        />
      ))}
    </span>
  )
}

function StarInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <span className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(value === i ? null : i)} aria-label={`${i} estrellas`}>
          <Star
            size={26}
            strokeWidth={1.5}
            className={cn('transition', value != null && i <= value ? 'fill-accent text-accent' : 'text-line hover:text-muted')}
          />
        </button>
      ))}
    </span>
  )
}

export function PlacesView() {
  const { places, settings } = useStore()
  const [kind, setKind] = useState('todos')
  const [editing, setEditing] = useState<Place | 'new' | null>(null)

  const list = useMemo(
    () =>
      places
        .filter((p) => kind === 'todos' || p.kind === kind)
        .sort((a, b) => (placeAvg(b) ?? 0) - (placeAvg(a) ?? 0) || a.name.localeCompare(b.name)),
    [places, kind],
  )
  const kinds = PLACE_KINDS.filter((k) => places.some((p) => p.kind === k))
  const nA = settings.nameA || 'Uno'
  const nB = settings.nameB || 'Otro'

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="no-scrollbar -mx-4 flex flex-1 gap-2 overflow-x-auto px-4">
          {['todos', ...kinds].map((k) => (
            <button key={k} className={cn(kind === k ? 'chip-on' : 'chip-off', 'capitalize')} onClick={() => setKind(k)}>
              {k}
            </button>
          ))}
        </div>
        <button className="btn-primary shrink-0" onClick={() => setEditing('new')}>
          <Plus size={16} /> Lugar
        </button>
      </div>

      {list.length ? (
        <ol className="mt-5 space-y-2">
          {list.map((p, i) => {
            const avg = placeAvg(p)
            return (
              <li key={p.id}>
                <button
                  onClick={() => setEditing(p)}
                  className="card flex w-full items-center gap-4 rounded-2xl p-4 text-left transition hover:shadow-lift"
                >
                  <span className="w-6 shrink-0 text-center font-serif text-xl text-muted tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-muted">
                      <span className="capitalize">{p.kind}</span>
                      {p.address && p.address !== p.name && ` · ${p.address}`}
                      {p.visitedAt && ` · ${formatDay(p.visitedAt)}`}
                    </span>
                    {(p.ratingA != null || p.ratingB != null) && (
                      <span className="mt-1 block text-xs text-muted">
                        {p.ratingA != null && `${nA} ${p.ratingA}★`}
                        {p.ratingA != null && p.ratingB != null && ' · '}
                        {p.ratingB != null && `${nB} ${p.ratingB}★`}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-serif text-2xl leading-none tabular-nums">
                      {avg != null ? avg.toFixed(1) : '–'}
                    </span>
                    <Stars value={avg} size={11} />
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      ) : (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-line p-8 text-center">
          <MapPin size={28} strokeWidth={1.25} className="mx-auto text-accent" />
          <p className="mt-2 font-serif text-xl">Su ranking de Santiago</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Guarden los restaurantes, cafés y miradores que visiten, y califíquenlos cada uno. Los mejores
            aparecen en la ruleta “Favoritos”.
          </p>
        </div>
      )}

      {places.some((p) => p.lat != null) && (
        <button className="btn-ghost mt-3 -ml-3" onClick={() => navigate('album', 'mapa')}>
          <MapPin size={15} /> Ver en el mapa
        </button>
      )}

      <PlaceSheet value={editing} onClose={() => setEditing(null)} nameA={nA} nameB={nB} />
    </div>
  )
}

function PlaceSheet({
  value,
  onClose,
  nameA,
  nameB,
}: {
  value: Place | 'new' | null
  onClose: () => void
  nameA: string
  nameB: string
}) {
  const { saveRow, removeRow } = useStore()
  const p = value && value !== 'new' ? value : null
  const [name, setName] = useState('')
  const [kind, setKind] = useState('restaurante')
  const [loc, setLoc] = useState<PickedLocation | null>(null)
  const [address, setAddress] = useState('')
  const [ra, setRa] = useState<number | null>(null)
  const [rb, setRb] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [visitedAt, setVisitedAt] = useState('')
  const [picking, setPicking] = useState(false)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (!value) return
    setName(p?.name ?? '')
    setKind(p?.kind ?? 'restaurante')
    setLoc(p?.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng, name: p.name } : null)
    setAddress(p?.address ?? '')
    setRa(p?.ratingA ?? null)
    setRb(p?.ratingB ?? null)
    setNote(p?.note ?? '')
    setVisitedAt(p?.visitedAt ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const save = () => {
    if (!name.trim()) return
    saveRow('places', {
      id: p?.id ?? uid(),
      name: name.trim(),
      kind,
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      address: address.trim(),
      ratingA: ra,
      ratingB: rb,
      note: note.trim(),
      visitedAt: visitedAt || null,
      createdAt: p?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  return (
    <>
      <Sheet open={!!value} onClose={onClose} title={p ? p.name : 'Nuevo lugar'}>
        <div className="space-y-4">
          <input className="field" placeholder="Nombre del lugar" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex flex-wrap gap-1.5">
            {PLACE_KINDS.map((k) => (
              <button key={k} className={cn(kind === k ? 'chip-on' : 'chip-off', 'h-8 capitalize')} onClick={() => setKind(k)}>
                {k}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-line p-3.5 text-left transition hover:border-ink/30"
          >
            <MapPin size={20} strokeWidth={1.5} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Ubicación</span>
              <span className="block truncate text-xs text-muted">{loc ? address || 'Guardada' : 'Buscar en el mapa'}</span>
            </span>
            <ChevronRight size={16} className="text-muted" />
          </button>
          <div className="grid gap-3 rounded-2xl bg-sand/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{nameA}</span>
              <StarInput value={ra} onChange={setRa} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{nameB}</span>
              <StarInput value={rb} onChange={setRb} />
            </div>
          </div>
          <input className="field" placeholder="¿Qué pidieron? ¿Qué tal estuvo?" value={note} onChange={(e) => setNote(e.target.value)} />
          <div>
            <label className="label" htmlFor="pv">
              Fecha de visita
            </label>
            <input id="pv" type="date" className="field" value={visitedAt} onChange={(e) => setVisitedAt(e.target.value)} />
          </div>
          <div className="flex items-center justify-between border-t border-line pt-4">
            {p ? (
              <button className="btn-ghost -ml-3 text-accent" onClick={() => setConfirm(true)}>
                <Trash2 size={16} /> Eliminar
              </button>
            ) : (
              <span />
            )}
            <button className="btn-primary px-6" onClick={save} disabled={!name.trim()}>
              Guardar
            </button>
          </div>
        </div>
      </Sheet>
      <LocationPicker
        open={picking}
        onClose={() => setPicking(false)}
        initial={loc}
        title="¿Dónde queda?"
        onPick={(l) => {
          setLoc(l)
          setAddress(l?.name ?? '')
          if (l?.name && !name.trim()) setName(l.name)
        }}
      />
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title="¿Eliminar este lugar?"
        onConfirm={() => {
          if (p) removeRow('places', p.id)
          onClose()
        }}
      />
    </>
  )
}
