import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import {
  ArrowRight,
  CloudRain,
  CloudSun,
  Dices,
  Heart,
  ListPlus,
  Moon,
  Shuffle,
  Snowflake,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '../store'
import { PhotoViewer } from '../components/PhotoViewer'
import { DailyPair } from '../components/DailyPair'
import { navigate } from '../lib/route'
import { upcoming } from '../lib/agenda'
import { daysSince, formatDay, photoDate, plural, todayISO } from '../lib/utils'
import { describe, fetchWeather, moodOf, MOOD_TEXT, SUGGESTIONS, type Mood, type Weather } from '../lib/weather'
import type { Photo } from '../lib/types'
import { AgendaRow } from './plans/CalendarView'
import { useAchievements } from './us/AchievementsView'

const MOOD_ICON: Record<Mood, LucideIcon> = {
  lluvia: CloudRain,
  calor: Sun,
  templado: CloudSun,
  frio: Snowflake,
  noche: Moon,
}

export function Home() {
  const { settings, photos, activities, events, places } = useStore()
  const today = todayISO()
  const [view, setView] = useState<{ list: Photo[]; i: number } | null>(null)
  const [randomId, setRandomId] = useState<string | null>(null)

  const days = settings.since ? daysSince(settings.since) : null
  const names = [settings.nameA, settings.nameB].filter(Boolean).join(' & ')
  const next = useMemo(() => upcoming({ events, activities, settings }, 3), [events, activities, settings])

  // "Un día como hoy": fotos del mismo día y mes de años anteriores
  const onThisDay = useMemo(
    () =>
      photos
        .filter((p) => {
          const d = photoDate(p).slice(0, 10)
          return d.slice(5) === today.slice(5) && d.slice(0, 4) < today.slice(0, 4)
        })
        .sort((a, b) => photoDate(b).localeCompare(photoDate(a))),
    [photos, today],
  )

  const pickRandom = () => {
    if (!photos.length) return
    let p = photos[Math.floor(Math.random() * photos.length)]
    if (photos.length > 1) while (p.id === randomId) p = photos[Math.floor(Math.random() * photos.length)]
    setRandomId(p.id)
  }
  useEffect(() => {
    if (!randomId && photos.length) pickRandom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length])
  const random = photos.find((p) => p.id === randomId) ?? null

  const done = activities.filter((a) => a.done).length
  const achievements = useAchievements()
  const unlocked = achievements.filter((a) => a.value >= a.goal)
  const nearest = achievements
    .filter((a) => a.value < a.goal && a.value > 0)
    .sort((a, b) => b.value / b.goal - a.value / a.goal)[0]

  const yearsAgo = (p: Photo) => Number(today.slice(0, 4)) - Number(photoDate(p).slice(0, 4))

  return (
    <section className="space-y-4">
      {/* Días juntos */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[28px] bg-ink px-6 py-8 text-paper sm:px-10 sm:py-12"
      >
        <Heart size={180} strokeWidth={0.6} className="pointer-events-none absolute -right-8 -bottom-10 text-paper/[0.06]" />
        {days !== null ? (
          <>
            <p className="text-xs tracking-[0.2em] text-paper/50 uppercase">{names || 'Juntos'}</p>
            <p className="mt-3 font-serif text-7xl leading-none font-light tabular-nums sm:text-8xl">
              {days.toLocaleString('es-CL')}
            </p>
            <p className="mt-2 text-paper/70">
              días juntos · desde el {formatDay(settings.since!)}
            </p>
          </>
        ) : (
          <>
            <p className="font-serif text-3xl">¿Desde cuándo están juntos?</p>
            <p className="mt-2 text-sm text-paper/60">Pongan la fecha en ⚙️ Ajustes y aquí aparecerá su contador.</p>
          </>
        )}
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Próximas fechas */}
        <Card title="Próximamente" action={['Calendario', () => navigate('planes', 'calendario')]}>
          {next.length ? (
            <div className="space-y-2">
              {next.map((it) => (
                <AgendaRow key={it.key} it={it} countdown onClick={() => navigate('planes', 'calendario')} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              Agenden un plan o agreguen cumpleaños y aniversarios en el calendario.
            </p>
          )}
        </Card>

        {/* Clima */}
        <WeatherCard />

        {/* Un día como hoy / recuerdo al azar */}
        {onThisDay.length > 0 ? (
          <Card title={`Un día como hoy · hace ${plural(yearsAgo(onThisDay[0]), 'año', 'años')}`}>
            <PhotoTile photo={onThisDay[0]} onClick={() => setView({ list: onThisDay, i: 0 })} />
            {onThisDay.length > 1 && <p className="mt-2 text-xs text-muted">y {onThisDay.length - 1} fotos más de este día</p>}
          </Card>
        ) : null}

        <Card
          title="Recuerdo al azar"
          action={photos.length > 1 ? ['Otro', pickRandom, Shuffle] : undefined}
        >
          {random ? (
            <>
              <PhotoTile photo={random} onClick={() => setView({ list: [random], i: 0 })} />
              <p className="mt-2 text-xs text-muted">
                {formatDay(photoDate(random))}
                {random.activityId && ` · ${activities.find((a) => a.id === random.activityId)?.title ?? ''}`}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">Cuando suban fotos, aquí aparecerá un recuerdo distinto cada vez.</p>
          )}
        </Card>

        {/* Foto del día */}
        <Card title="La foto de hoy" action={['Ver diario', () => navigate('album', 'diario')]}>
          <DailyPair date={today} compact />
        </Card>

        {/* Números */}
        <Card title="Hasta ahora" action={['Logros', () => navigate('nosotros', 'logros')]}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Num n={photos.length} label="fotos" />
            <Num n={done} label="planes" />
            <Num n={places.length} label="lugares" />
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-sand/60 p-3">
            <span className="font-serif text-2xl tabular-nums">
              {unlocked.length}
              <span className="text-muted/60">/{achievements.length}</span>
            </span>
            <span className="text-xs leading-snug text-muted">
              logros
              {nearest && (
                <>
                  <br />
                  Próximo: <span className="text-ink">{nearest.title}</span> ({nearest.value}/{nearest.goal})
                </>
              )}
            </span>
          </div>
        </Card>
      </div>

      <PhotoViewer photos={view?.list ?? []} index={view ? view.i : -1} onClose={() => setView(null)} />
    </section>
  )
}

function WeatherCard() {
  const { addActivity, toast } = useStore()
  const [w, setW] = useState<Weather | null>(null)
  const [failed, setFailed] = useState(false)
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * 100))

  useEffect(() => {
    fetchWeather().then(setW, () => setFailed(true))
  }, [])

  if (failed) return null
  const mood = w ? moodOf(w) : null
  const list = mood ? SUGGESTIONS[mood] : []
  const idea = list.length ? list[idx % list.length] : ''
  const Icon = mood ? MOOD_ICON[mood] : CloudSun

  return (
    <Card title="Hoy en Santiago">
      {w && mood ? (
        <>
          <div className="flex items-center gap-4">
            <Icon size={40} strokeWidth={1.25} className="text-accent" />
            <div>
              <p className="font-serif text-4xl leading-none tabular-nums">{Math.round(w.temp)}°</p>
              <p className="mt-1 text-xs text-muted">
                {describe(w.code)} · {Math.round(w.min)}° / {Math.round(w.max)}°
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-sand/60 p-4">
            <p className="text-xs text-muted">{MOOD_TEXT[mood]}</p>
            <motion.p key={idea} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 font-serif text-xl">
              {idea}
            </motion.p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-outline h-8 text-xs" onClick={() => setIdx((i) => i + 1)}>
                <Shuffle size={13} /> Otra idea
              </button>
              <button
                className="btn-outline h-8 text-xs"
                onClick={() => {
                  addActivity(idea)
                  toast(`“${idea}” agregado a Planes`)
                }}
              >
                <ListPlus size={13} /> A planes
              </button>
              <button className="btn-ghost h-8 text-xs" onClick={() => navigate('ruleta')}>
                <Dices size={13} /> Ruleta
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="h-32 animate-pulse rounded-2xl bg-sand/60" />
      )}
    </Card>
  )
}

function Card({
  title,
  action,
  children,
}: {
  title: string
  action?: [string, () => void, LucideIcon?]
  children: React.ReactNode
}) {
  const ActionIcon = action?.[2] ?? ArrowRight
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-[0.12em] text-muted uppercase">{title}</p>
        {action && (
          <button className="-mr-1 flex items-center gap-1 text-xs text-muted transition hover:text-ink" onClick={action[1]}>
            {action[0]} <ActionIcon size={13} />
          </button>
        )}
      </div>
      {children}
    </motion.div>
  )
}

function PhotoTile({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  return (
    <button onClick={onClick} className="block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-sand">
      <img src={photo.thumb} alt="" className="size-full object-cover transition duration-700 hover:scale-[1.03]" />
    </button>
  )
}

function Num({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <p className="font-serif text-3xl tabular-nums">{n.toLocaleString('es-CL')}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}
