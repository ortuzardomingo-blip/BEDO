import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useStore } from '../../store'
import { computeAchievements } from '../../lib/achievements'
import { cn, dailyStreak } from '../../lib/utils'

export function useAchievements() {
  const s = useStore()
  return useMemo(() => {
    const streak = dailyStreak(new Set(s.photos.filter((p) => p.dailyDate).map((p) => p.dailyDate!)))
    return computeAchievements(s, s.settings, streak)
  }, [s])
}

export function AchievementsView() {
  const list = useAchievements()
  const unlocked = list.filter((a) => a.value >= a.goal).length

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-serif text-4xl tabular-nums">
            {unlocked}
            <span className="text-muted/60">/{list.length}</span>
          </p>
          <p className="text-sm text-muted">logros desbloqueados</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list
          .slice()
          .sort((a, b) => Number(b.value >= b.goal) - Number(a.value >= a.goal))
          .map((a, i) => {
            const ok = a.value >= a.goal
            const pct = Math.round((a.value / a.goal) * 100)
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={cn('card rounded-2xl p-4', !ok && 'bg-card/60 shadow-none')}
              >
                <span
                  className={cn(
                    'grid size-11 place-items-center rounded-2xl',
                    ok ? 'bg-ink text-paper' : 'bg-sand text-muted/60',
                  )}
                >
                  <a.icon size={20} strokeWidth={1.6} />
                </span>
                <p className={cn('mt-3 font-medium', !ok && 'text-ink-soft')}>{a.title}</p>
                <p className="text-xs text-muted">{a.description}</p>
                {!ok && (
                  <div className="mt-3">
                    <div className="h-1 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-accent/70" style={{ width: `${pct}%` }} />
                    </div>
                    {a.goal > 1 && (
                      <p className="mt-1 text-[11px] text-muted tabular-nums">
                        {a.value.toLocaleString('es-CL')} / {a.goal.toLocaleString('es-CL')}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )
          })}
      </div>
    </div>
  )
}
