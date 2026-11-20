import { useMemo } from 'react'
import { Camera, Pencil } from 'lucide-react'
import { useStore } from '../store'
import type { Photo } from '../lib/types'
import { cn, photoDate } from '../lib/utils'

const TILTS = [-2.2, 1.6, -1, 2, -1.6, 1.1, -0.6, 2.4]

function useFrameItems(min: number): (Photo | null)[] {
  const { photos } = useStore()
  return useMemo(() => {
    const framed = photos.filter((p) => p.inFrame)
    const base = (framed.length ? framed : photos)
      .slice()
      .sort((a, b) => photoDate(b).localeCompare(photoDate(a)))
      .slice(0, framed.length ? undefined : 16)
    const list: (Photo | null)[] = base.length ? base : Array(6).fill(null)
    const out: (Photo | null)[] = []
    while (out.length < min) out.push(...list)
    return out
  }, [photos, min])
}

function Tile({ photo, i, className }: { photo: Photo | null; i: number; className?: string }) {
  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden rounded-xl bg-card p-1 shadow-soft transition-transform duration-500 hover:z-10 hover:scale-[1.06] hover:rotate-0',
        className,
      )}
      style={{ rotate: `${TILTS[i % TILTS.length]}deg` }}
    >
      {photo ? (
        <img
          src={photo.thumb}
          alt=""
          loading="lazy"
          draggable={false}
          className="size-full rounded-lg object-cover"
        />
      ) : (
        <div className="grid size-full place-items-center rounded-lg bg-sand text-muted/60">
          <Camera size={18} strokeWidth={1.5} />
        </div>
      )}
    </div>
  )
}

/** Tira horizontal (todas las pantallas) */
export function FrameStrip({ onEdit }: { onEdit: () => void }) {
  const items = useFrameItems(12)
  return (
    <div className="group relative">
      <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
        <div
          className="flex w-max animate-marquee gap-3 px-2 py-3 group-hover:[animation-play-state:paused] sm:gap-4"
          style={{ animationDuration: `${items.length * 4.5}s` }}
        >
          {[...items, ...items].map((p, i) => (
            <Tile key={i} photo={p} i={i} className="size-16 sm:size-20 lg:size-24" />
          ))}
        </div>
      </div>
      <button
        onClick={onEdit}
        className="absolute right-3 bottom-1 flex items-center gap-1.5 rounded-full border border-line bg-card/90 px-3 py-1.5 text-xs text-ink-soft shadow-soft backdrop-blur transition hover:text-ink md:opacity-0 md:group-hover:opacity-100"
      >
        <Pencil size={12} /> Marco
      </button>
    </div>
  )
}

function Rail({ side }: { side: 'left' | 'right' }) {
  const items = useFrameItems(8)
  const shown = side === 'right' ? items.slice().reverse() : items
  return (
    <aside
      className={cn(
        'fixed top-0 bottom-0 z-0 hidden w-[var(--rail)] overflow-hidden lg:block',
        side === 'left' ? 'left-0' : 'right-0',
        '[mask-image:linear-gradient(180deg,transparent,#000_10%,#000_90%,transparent)]',
      )}
      aria-hidden
    >
      <div
        className="flex flex-col gap-5 px-4 py-6 hover:[animation-play-state:paused] xl:px-6"
        style={{
          animation: `marquee-y ${items.length * 7}s linear infinite ${side === 'right' ? 'reverse' : 'normal'}`,
        }}
      >
        {[...shown, ...shown].map((p, i) => (
          <Tile key={i} photo={p} i={i + (side === 'right' ? 3 : 0)} className="aspect-[4/5] w-full" />
        ))}
      </div>
    </aside>
  )
}

/** Columnas laterales de fotos (pantallas grandes) */
export function FrameRails() {
  return (
    <>
      <Rail side="left" />
      <Rail side="right" />
    </>
  )
}
