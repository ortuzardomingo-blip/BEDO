import { motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../lib/utils'

export interface SegOption<T extends string> {
  id: T
  label: string
  icon?: LucideIcon
}

/** Selector de subsección (Fotos / Mapa / Diario, etc.) */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  layoutId,
  className,
}: {
  value: T
  options: SegOption<T>[]
  onChange: (v: T) => void
  layoutId: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'no-scrollbar inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full border border-line bg-sand/60 p-1',
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'relative flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm transition',
            value === o.id ? 'text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {value === o.id && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-full bg-card shadow-soft"
              transition={{ type: 'spring', damping: 32, stiffness: 400 }}
            />
          )}
          {o.icon && <o.icon size={15} strokeWidth={1.75} className="relative" />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

/** Encabezado estándar de cada pestaña */
export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-4xl font-light tracking-tight sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
