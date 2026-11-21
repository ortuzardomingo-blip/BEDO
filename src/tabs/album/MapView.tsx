import { useMemo, useState } from 'react'
import { Marker, Popup } from 'react-leaflet'
import { MapPin, Star } from 'lucide-react'
import { useStore } from '../../store'
import { BaseMap, FitBounds, dotIcon, photoIcon } from '../../components/map/BaseMap'
import { PhotoViewer } from '../../components/PhotoViewer'
import { groupPhotos, type LatLng } from '../../lib/geo'
import { navigate } from '../../lib/route'
import { SANTIAGO, distanceKm, plural } from '../../lib/utils'
import type { Photo } from '../../lib/types'

export function MapView() {
  const { photos, activities, places } = useStore()
  const [viewing, setViewing] = useState<Photo[] | null>(null)

  const groups = useMemo(() => groupPhotos(photos, activities), [photos, activities])
  const pinned = places.filter((p) => p.lat != null && p.lng != null)
  const located = groups.reduce((n, g) => n + g.photos.length, 0)
  const missing = photos.length - located

  const points: LatLng[] = [...groups, ...pinned.map((p) => ({ lat: p.lat!, lng: p.lng! }))]
  const farthest = points.reduce((m, p) => Math.max(m, distanceKm(SANTIAGO, p)), 0)

  const avg = (a: number | null, b: number | null) => {
    const v = [a, b].filter((x): x is number => x != null)
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="lugares" value={groups.length + pinned.length} />
        <Stat label="fotos en el mapa" value={located} />
        <Stat label="km al más lejano" value={Math.round(farthest)} />
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-line shadow-soft">
        <BaseMap className="h-[62dvh] min-h-[360px] w-full" zoom={5}>
          <FitBounds points={points} />
          {groups.map((g) => (
            <Marker
              key={g.key}
              position={[g.lat, g.lng]}
              icon={photoIcon(g.photos[0].thumb, g.photos.length)}
              eventHandlers={{ click: () => setViewing(g.photos) }}
            />
          ))}
          {pinned.map((p) => {
            const r = avg(p.ratingA, p.ratingB)
            return (
              <Marker key={p.id} position={[p.lat!, p.lng!]} icon={dotIcon('ink', '★')}>
                <Popup>
                  <div className="font-sans">
                    <p className="text-sm font-semibold text-ink">{p.name}</p>
                    <p className="text-xs text-muted capitalize">{p.kind}</p>
                    {r != null && <p className="mt-1 text-xs">★ {r.toFixed(1)}</p>}
                    {p.note && <p className="mt-1 text-xs text-ink-soft">{p.note}</p>}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </BaseMap>
        {points.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-[500] grid place-items-center bg-paper/50 p-6 text-center">
            <div className="max-w-xs rounded-3xl bg-card/95 p-5 shadow-lift">
              <MapPin size={26} strokeWidth={1.5} className="mx-auto text-accent" />
              <p className="mt-2 font-serif text-xl">Su mapa está vacío</p>
              <p className="mt-1 text-sm text-muted">
                Asignen una ubicación a sus fotos o planes y aparecerán aquí.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2 text-sm text-muted">
        <p className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-[4px] border-2 border-card bg-muted shadow-soft" /> Fotos
          <Star size={13} className="ml-3 fill-ink text-ink" /> Nuestros lugares
          <button className="ml-auto underline-offset-2 hover:underline" onClick={() => navigate('nosotros', 'lugares')}>
            Ver lugares →
          </button>
        </p>
        {missing > 0 && (
          <p className="rounded-2xl bg-sand/60 p-3.5 text-[13px] leading-relaxed">
            {plural(missing, 'foto no tiene', 'fotos no tienen')} ubicación. Los celulares suelen quitarla al
            subir fotos por seguridad. Para agregarla: <b className="font-medium text-ink">Fotos → Seleccionar</b>{' '}
            → elige varias → <b className="font-medium text-ink">Ubicación</b>. Las fotos de un plan con
            ubicación aparecen solas.
          </p>
        )}
      </div>

      <PhotoViewer photos={viewing ?? []} index={viewing ? 0 : -1} onClose={() => setViewing(null)} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card rounded-2xl px-3 py-3 sm:px-4">
      <p className="font-serif text-2xl tabular-nums sm:text-3xl">{value.toLocaleString('es-CL')}</p>
      <p className="text-[11px] leading-tight text-muted sm:text-xs">{label}</p>
    </div>
  )
}
