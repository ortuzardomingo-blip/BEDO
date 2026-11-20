import { useEffect, useMemo, useState } from 'react'
import { Check, Cloud, HardDrive, ImagePlus, LogOut } from 'lucide-react'
import { Sheet } from './Sheet'
import { UploadButton } from './UploadButton'
import { useStore } from '../store'
import { cn, photoDate } from '../lib/utils'

export function SettingsSheet({
  open,
  onClose,
  section,
}: {
  open: boolean
  onClose: () => void
  section?: 'frame'
}) {
  const { settings, updateSettings, photos, updatePhoto, uploadPhotos, mode, signOut } = useStore()
  const [title, setTitle] = useState('')
  const [nameA, setNameA] = useState('')
  const [nameB, setNameB] = useState('')
  const [since, setSince] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(settings.title)
    setNameA(settings.nameA)
    setNameB(settings.nameB)
    setSince(settings.since ?? '')
    if (section === 'frame') {
      setTimeout(() => document.getElementById('frame-section')?.scrollIntoView({ behavior: 'smooth' }), 350)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const sorted = useMemo(
    () => photos.slice().sort((a, b) => photoDate(b).localeCompare(photoDate(a))),
    [photos],
  )
  const inFrame = photos.filter((p) => p.inFrame).length

  const close = () => {
    const patch = {
      title: title.trim() || 'BEDO',
      nameA: nameA.trim(),
      nameB: nameB.trim(),
      since: since || null,
    }
    if (
      patch.title !== settings.title ||
      patch.nameA !== settings.nameA ||
      patch.nameB !== settings.nameB ||
      patch.since !== settings.since
    )
      updateSettings(patch)
    onClose()
  }

  return (
    <Sheet open={open} onClose={close} title="Ajustes" wide>
      <div className="space-y-8">
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="na">
                Nombre 1
              </label>
              <input id="na" className="field" value={nameA} onChange={(e) => setNameA(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="nb">
                Nombre 2
              </label>
              <input id="nb" className="field" value={nameB} onChange={(e) => setNameB(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="ti">
                Título
              </label>
              <input id="ti" className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="si">
                Juntos desde
              </label>
              <input
                id="si"
                type="date"
                className="field"
                value={since}
                onChange={(e) => setSince(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section id="frame-section">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h3 className="font-serif text-xl">Fotos del marco</h3>
              <p className="text-sm text-muted">
                {inFrame
                  ? `${inFrame} seleccionada${inFrame === 1 ? '' : 's'}`
                  : 'Sin selección: se muestran las más recientes'}
              </p>
            </div>
            <UploadButton className="btn-outline h-9 shrink-0" onFiles={(f) => uploadPhotos(f, { inFrame: true })}>
              <ImagePlus size={15} /> Subir
            </UploadButton>
          </div>
          {sorted.length ? (
            <div className="grid max-h-80 grid-cols-4 gap-1.5 overflow-y-auto rounded-2xl sm:grid-cols-6">
              {sorted.map((p) => (
                <button
                  key={p.id}
                  onClick={() => updatePhoto(p.id, { inFrame: !p.inFrame })}
                  className="relative aspect-square overflow-hidden rounded-xl bg-sand"
                  aria-pressed={p.inFrame}
                >
                  <img
                    src={p.thumb}
                    alt=""
                    loading="lazy"
                    className={cn('size-full object-cover transition', !p.inFrame && 'opacity-55 grayscale-[40%]')}
                  />
                  <span
                    className={cn(
                      'absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full border transition',
                      p.inFrame ? 'border-ink bg-ink text-paper' : 'border-white/90 bg-black/10 text-transparent',
                    )}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-sand/60 p-4 text-sm text-muted">
              Cuando suban fotos podrán elegir cuáles aparecen alrededor de la app.
            </p>
          )}
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sand/60 p-4">
          <div className="flex items-center gap-3">
            {mode === 'cloud' ? <Cloud size={20} strokeWidth={1.5} /> : <HardDrive size={20} strokeWidth={1.5} />}
            <div>
              <p className="text-sm font-medium">
                {mode === 'cloud' ? 'Sincronizado en la nube' : 'Modo local'}
              </p>
              <p className="text-xs text-muted">
                {mode === 'cloud'
                  ? 'Los cambios se ven en todos sus dispositivos.'
                  : 'Los datos viven solo en este navegador. Configura Supabase para compartirlos.'}
              </p>
            </div>
          </div>
          {signOut && (
            <button className="btn-outline h-9" onClick={signOut}>
              <LogOut size={15} /> Salir
            </button>
          )}
        </section>
      </div>
    </Sheet>
  )
}
