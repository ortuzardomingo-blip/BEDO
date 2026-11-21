import { useEffect, type ReactNode } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLng } from '../../lib/geo'
import { SANTIAGO } from '../../lib/utils'

/** Recalcula el tamaño cuando el mapa aparece dentro de una animación u hoja */
function Resizer() {
  const map = useMap()
  useEffect(() => {
    const t = [100, 400].map((ms) => setTimeout(() => map.invalidateSize(), ms))
    return () => t.forEach(clearTimeout)
  }, [map])
  return null
}

/** Encuadra todos los puntos al cargar */
export function FitBounds({ points, maxZoom = 13 }: { points: LatLng[]; maxZoom?: number }) {
  const map = useMap()
  const sig = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|')
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], maxZoom)
    else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [48, 48], maxZoom })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, sig])
  return null
}

export function BaseMap({
  children,
  className,
  center = SANTIAGO,
  zoom = 11,
}: {
  children?: ReactNode
  className?: string
  center?: LatLng
  zoom?: number
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      className={className}
      zoomControl={false}
      attributionControl
      style={{ background: '#efe9e0' }}
    >
      {/* OpenStreetMap (gratis); el filtro CSS .bedo-tiles lo deja en tonos neutros */}
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        className="bedo-tiles"
        maxZoom={19}
      />
      <Resizer />
      {children}
    </MapContainer>
  )
}

/** Pin simple (lugares y selección) */
export function dotIcon(kind: 'ink' | 'accent' = 'ink', label = '') {
  const color = kind === 'ink' ? '#1d1b19' : '#b5654a'
  return L.divIcon({
    className: '',
    iconSize: [30, 38],
    iconAnchor: [15, 36],
    html: `<svg width="30" height="38" viewBox="0 0 30 38"><path d="M15 37C15 37 28 24 28 14A13 13 0 0 0 2 14C2 24 15 37 15 37Z" fill="${color}" stroke="#fffdfa" stroke-width="2"/><text x="15" y="18" text-anchor="middle" font-size="11" font-family="Inter,sans-serif" fill="#fffdfa">${label}</text></svg>`,
  })
}

/** Pin con miniatura de foto y contador */
export function photoIcon(thumb: string, count: number) {
  return L.divIcon({
    className: '',
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    html: `<div style="position:relative;width:52px;height:52px;border-radius:16px;background:#fffdfa;padding:3px;box-shadow:0 6px 18px -6px rgba(29,27,25,.45);transform:rotate(-3deg)">
      <img src="${thumb}" style="width:100%;height:100%;object-fit:cover;border-radius:13px;display:block"/>
      ${count > 1 ? `<span style="position:absolute;top:-7px;right:-7px;min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:#1d1b19;color:#f6f3ee;font:600 11px Inter,sans-serif;display:grid;place-items:center;border:2px solid #fffdfa">${count}</span>` : ''}
    </div>`,
  })
}
