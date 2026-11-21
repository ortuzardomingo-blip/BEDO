import { useEffect, useRef, useState } from 'react'
import { Marker, useMapEvents } from 'react-leaflet'
import { Loader2, LocateFixed, MapPin, Search, Trash2 } from 'lucide-react'
import { Sheet } from '../Sheet'
import { BaseMap, FitBounds, dotIcon } from './BaseMap'
import { searchPlaces, type GeoResult, type LatLng } from '../../lib/geo'

export interface PickedLocation extends LatLng {
  name: string
}

function ClickToSet({ onSet }: { onSet: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onSet({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

/** Hoja para elegir un lugar: buscar por nombre, tocar el mapa o usar la ubicación actual */
export function LocationPicker({
  open,
  onClose,
  onPick,
  initial,
  title = 'Elegir ubicación',
}: {
  open: boolean
  onClose: () => void
  onPick: (loc: PickedLocation | null) => void
  initial?: PickedLocation | null
  title?: string
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [loading, setLoading] = useState(false)
  const [point, setPoint] = useState<PickedLocation | null>(null)
  const [focus, setFocus] = useState<LatLng[]>([])
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!open) return
    setQ('')
    setResults([])
    setPoint(initial ?? null)
    setFocus(initial ? [initial] : [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Búsqueda con pausa para no saturar el servicio
  useEffect(() => {
    if (q.trim().length < 3) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      abort.current?.abort()
      abort.current = new AbortController()
      setLoading(true)
      try {
        setResults(await searchPlaces(q.trim(), abort.current.signal))
      } catch {
        /* cancelada */
      } finally {
        setLoading(false)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [q])

  const choose = (r: GeoResult) => {
    setPoint({ lat: r.lat, lng: r.lng, name: r.name })
    setFocus([r])
    setResults([])
    setQ(r.name)
  }

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setPoint({ ...p, name: point?.name || 'Aquí' })
        setFocus([p])
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    )

  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle="Busca el lugar o toca el mapa." wide>
      <div className="space-y-3">
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <input
            className="field pl-10"
            placeholder="Ej: Cerro San Cristóbal, Valparaíso…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {loading && (
            <Loader2 size={16} className="absolute top-1/2 right-3.5 -translate-y-1/2 animate-spin text-muted" />
          )}
          {results.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-[1100] mt-1 overflow-hidden rounded-2xl border border-line bg-card shadow-lift">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    onClick={() => choose(r)}
                    className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition hover:bg-sand"
                  >
                    <MapPin size={15} className="mt-0.5 shrink-0 text-muted" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{r.name}</span>
                      <span className="block truncate text-xs text-muted">{r.address}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-line">
          <BaseMap className="h-[min(48dvh,380px)] w-full">
            <ClickToSet onSet={(p) => setPoint({ ...p, name: point?.name ?? '' })} />
            <FitBounds points={focus} maxZoom={15} />
            {point && <Marker position={[point.lat, point.lng]} icon={dotIcon('accent')} />}
          </BaseMap>
          <button
            onClick={locate}
            className="absolute right-3 bottom-3 z-[500] flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-2 text-xs shadow-soft"
          >
            <LocateFixed size={14} /> Mi ubicación
          </button>
        </div>

        {point && (
          <input
            className="field"
            placeholder="Nombre del lugar (opcional)"
            value={point.name}
            onChange={(e) => setPoint({ ...point, name: e.target.value })}
          />
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          {initial ? (
            <button
              className="btn-ghost -ml-3 text-accent"
              onClick={() => {
                onPick(null)
                onClose()
              }}
            >
              <Trash2 size={15} /> Quitar
            </button>
          ) : (
            <span />
          )}
          <button
            className="btn-primary px-6"
            disabled={!point}
            onClick={() => {
              if (point) onPick(point)
              onClose()
            }}
          >
            Guardar ubicación
          </button>
        </div>
      </div>
    </Sheet>
  )
}
