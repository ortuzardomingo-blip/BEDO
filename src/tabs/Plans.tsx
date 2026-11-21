import { motion } from 'motion/react'
import { CalendarDays, ListChecks, PiggyBank } from 'lucide-react'
import { useStore } from '../store'
import { PageTitle, Segmented } from '../components/Segmented'
import { navigate } from '../lib/route'
import { ListView } from './plans/ListView'
import { CalendarView } from './plans/CalendarView'
import { GoalsView } from './plans/GoalsView'

type Sub = 'lista' | 'calendario' | 'ahorro'

export function Plans({ sub }: { sub: string }) {
  const { activities } = useStore()
  const view: Sub = sub === 'calendario' || sub === 'ahorro' ? sub : 'lista'
  const done = activities.filter((a) => a.done).length
  const total = activities.length
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <section>
      <PageTitle title="Planes" subtitle="Todo lo que queremos hacer juntos.">
        <div className="w-full sm:w-64">
          <div className="flex items-baseline justify-between">
            <span className="font-serif text-3xl tabular-nums">
              {done}
              <span className="text-muted/60">/{total}</span>
            </span>
            <span className="text-xs tracking-[0.14em] text-muted uppercase">{pct}% cumplido</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', damping: 30 }}
            />
          </div>
        </div>
      </PageTitle>

      <Segmented
        className="mt-6"
        layoutId="plans-seg"
        value={view}
        onChange={(v) => navigate('planes', v === 'lista' ? '' : v)}
        options={[
          { id: 'lista', label: 'Lista', icon: ListChecks },
          { id: 'calendario', label: 'Calendario', icon: CalendarDays },
          { id: 'ahorro', label: 'Alcancía', icon: PiggyBank },
        ]}
      />

      <div className="mt-6">
        {view === 'lista' && <ListView />}
        {view === 'calendario' && <CalendarView />}
        {view === 'ahorro' && <GoalsView />}
      </div>
    </section>
  )
}
