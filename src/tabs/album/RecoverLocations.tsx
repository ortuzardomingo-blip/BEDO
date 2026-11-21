import { useRef, useState } from 'react'
import { Loader2, LocateFixed } from 'lucide-react'
import { useStore } from '../../store'
import { Sheet } from '../../components/Sheet'
import { ACCEPT_IMAGES, readMeta } from '../../lib/images'
import { cn } from '../../lib/utils'

interface Result {
  located: number
  noGps: number
  notFound: number
  already: number
}

/**
 * Las fotos guardadas ya no traen GPS (se pierde al comprimir, y el celular suele quitarlo).
 * Aquí se vuelven a elegir los ORIGINALES: se lee su GPS y se reconocen en el álbum por la
 * fecha y hora exactas en que se tomaron. No se sube nada de nuevo.
 */
export function RecoverLocations({ className }: { className?: string }) {
  const { photos, updatePhoto } = useStore()
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const run = async (files: File[]) => {
    // Índice de fotos del álbum por fecha/hora de captura (al segundo)
    const byTime = new Map<string, typeof photos>()
    for (const p of photos) {
      if (!p.takenAt) continue
      const k = p.takenAt.slice(0, 19)
      byTime.set(k, [...(byTime.get(k) ?? []), p])
    }
    const r: Result = { located: 0, noGps: 0, notFound: 0, already: 0 }
    setBusy({ done: 0, total: files.length })
    for (let i = 0; i < files.length; i++) {
      const m = await readMeta(files[i])
      if (m.lat == null || m.lng == null) r.noGps++
      else {
        const matches = m.takenAt ? (byTime.get(m.takenAt.slice(0, 19)) ?? []) : []
        if (!matches.length) r.notFound++
        for (const p of matches) {
          if (p.lat != null) r.already++
          else {
            updatePhoto(p.id, { lat: m.lat, lng: m.lng })
            r.located++
          }
        }
      }
      setBusy({ done: i + 1, total: files.length })
    }
    setBusy(null)
    setResult(r)
  }

  return (
    <>
      <button
        className={cn('btn-outline', className)}
        disabled={!!busy}
        onClick={() => ref.current?.click()}
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />}
        {busy ? `Leyendo ${busy.done}/${busy.total}…` : 'Recuperar ubicaciones'}
      </button>
      <input
        ref={ref}
        type="file"
        accept={ACCEPT_IMAGES}
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length) run(files)
        }}
      />

      <Sheet open={!!result} onClose={() => setResult(null)} title="Ubicaciones recuperadas">
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat n={result.located} label="fotos ubicadas" strong />
              <Stat n={result.noGps} label="venían sin GPS" />
              <Stat n={result.notFound} label="no están en el álbum" />
            </div>
            {result.already > 0 && (
              <p className="text-sm text-muted">{result.already} ya tenían ubicación y no se cambiaron.</p>
            )}
            {result.noGps > 0 && (
              <div className="rounded-2xl bg-sand/60 p-4 text-sm leading-relaxed text-ink-soft">
                <p className="font-medium text-ink">¿Por qué algunas venían sin GPS?</p>
                <p className="mt-1">
                  Por privacidad, el celular suele quitar la ubicación al elegir fotos desde el navegador.
                  Funciona mejor <b className="font-medium text-ink">desde el computador</b>, con las fotos
                  originales: descargadas de Google Fotos o iCloud, o copiadas por cable.
                </p>
                <p className="mt-2">
                  También pueden asignarla a mano: <b className="font-medium text-ink">Fotos → Seleccionar →
                  Ubicación</b>, o poniéndole un lugar al plan.
                </p>
              </div>
            )}
            <button className="btn-primary h-11 w-full" onClick={() => setResult(null)}>
              Listo
            </button>
          </div>
        )}
      </Sheet>
    </>
  )
}

function Stat({ n, label, strong }: { n: number; label: string; strong?: boolean }) {
  return (
    <div className={cn('rounded-2xl p-3', strong ? 'bg-ink text-paper' : 'bg-sand/60')}>
      <p className="font-serif text-3xl tabular-nums">{n}</p>
      <p className={cn('text-[11px] leading-tight', strong ? 'text-paper/70' : 'text-muted')}>{label}</p>
    </div>
  )
}
