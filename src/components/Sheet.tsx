import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '../lib/utils'

let openCount = 0

/** Hoja inferior en celular, diálogo centrado en pantallas grandes */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    openCount++
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      if (--openCount === 0) document.body.style.overflow = ''
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-ink/35 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-card shadow-lift sm:rounded-[28px]',
              wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
            )}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line sm:hidden" />
            <div className="flex items-start gap-3 px-5 pt-4 pb-2 sm:px-7 sm:pt-6">
              <div className="min-w-0 flex-1">
                {title && <h2 className="font-serif text-2xl leading-tight">{title}</h2>}
                {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
              </div>
              <button className="btn-icon -mr-2 -mt-1" onClick={onClose} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-7 sm:pb-7">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  text,
  action = 'Eliminar',
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  text?: string
  action?: string
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={text}>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="btn bg-accent text-white hover:brightness-95"
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {action}
        </button>
      </div>
    </Sheet>
  )
}
