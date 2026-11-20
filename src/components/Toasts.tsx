import { AnimatePresence, motion } from 'motion/react'
import { useStore } from '../store'

export function Toasts() {
  const { toasts, upload } = useStore()
  const pct = upload ? Math.round((upload.done / Math.max(upload.total, 1)) * 100) : 0

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[2000] flex flex-col items-center gap-2 px-4 md:bottom-8">
      <AnimatePresence>
        {upload && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="w-full max-w-xs rounded-2xl bg-ink px-4 py-3 text-paper shadow-lift"
          >
            <div className="flex items-center justify-between text-sm">
              <span>Subiendo fotos…</span>
              <span className="tabular-nums text-paper/70">
                {upload.done}/{upload.total}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-paper/15">
              <motion.div
                className="h-full rounded-full bg-paper"
                animate={{ width: `${Math.max(pct, 6)}%` }}
                transition={{ ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )}
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="rounded-full bg-ink px-4 py-2.5 text-sm text-paper shadow-lift"
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
