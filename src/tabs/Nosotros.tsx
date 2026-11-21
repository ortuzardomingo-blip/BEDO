import { Award, BookHeart, BookOpen, ListTodo, MapPin, Sparkles } from 'lucide-react'
import { PageTitle, Segmented } from '../components/Segmented'
import { navigate } from '../lib/route'
import { HistoryView } from './us/HistoryView'
import { PlacesView } from './us/PlacesView'
import { ListsView } from './us/ListsView'
import { AchievementsView } from './us/AchievementsView'
import { YearView } from './us/YearView'
import { BookView } from './us/BookView'

const SUBS = [
  { id: 'historia', label: 'Historia', icon: BookHeart },
  { id: 'lugares', label: 'Lugares', icon: MapPin },
  { id: 'listas', label: 'Por probar', icon: ListTodo },
  { id: 'logros', label: 'Logros', icon: Award },
  { id: 'resumen', label: 'Resumen', icon: Sparkles },
  { id: 'libro', label: 'Libro', icon: BookOpen },
] as const
type Sub = (typeof SUBS)[number]['id']

const SUBTITLES: Record<Sub, string> = {
  historia: 'Los momentos que nos trajeron hasta aquí.',
  lugares: 'Nuestro ranking personal de lugares.',
  listas: 'Películas, series, comidas y más por probar juntos.',
  logros: 'Pequeñas medallas por todo lo vivido.',
  resumen: 'Nuestro año en números.',
  libro: 'Un fotolibro para imprimir o regalar.',
}

export function Nosotros({ sub }: { sub: string }) {
  const view: Sub = SUBS.some((s) => s.id === sub) ? (sub as Sub) : 'historia'
  return (
    <section>
      <PageTitle title="Nosotros" subtitle={SUBTITLES[view]} />
      <div className="-mx-4 mt-6 px-4">
        <Segmented
          layoutId="us-seg"
          value={view}
          onChange={(v) => navigate('nosotros', v === 'historia' ? '' : v)}
          options={[...SUBS]}
        />
      </div>
      <div className="mt-6">
        {view === 'historia' && <HistoryView />}
        {view === 'lugares' && <PlacesView />}
        {view === 'listas' && <ListsView />}
        {view === 'logros' && <AchievementsView />}
        {view === 'resumen' && <YearView />}
        {view === 'libro' && <BookView />}
      </div>
    </section>
  )
}
