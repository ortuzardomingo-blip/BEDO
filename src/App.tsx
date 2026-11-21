import { useEffect, useMemo, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { AnimatePresence, motion } from 'motion/react'
import { Dices, Heart, House, Images, ListChecks, Settings as Gear, type LucideIcon } from 'lucide-react'
import { StoreProvider, useStore } from './store'
import { supabase, createSupabaseBackend } from './lib/supabase'
import { localBackend } from './lib/localBackend'
import { Login } from './components/Login'
import { Toasts } from './components/Toasts'
import { FrameRails, FrameStrip } from './components/PhotoFrame'
import { SettingsSheet } from './components/SettingsSheet'
import { Home } from './tabs/Home'
import { Album } from './tabs/Album'
import { Plans } from './tabs/Plans'
import { Roulette } from './tabs/Roulette'
import { Nosotros } from './tabs/Nosotros'
import { navigate, useRoute, type Tab } from './lib/route'
import { cn, daysSince } from './lib/utils'

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'inicio', label: 'Inicio', icon: House },
  { id: 'album', label: 'Álbum', icon: Images },
  { id: 'planes', label: 'Planes', icon: ListChecks },
  { id: 'ruleta', label: 'Ruleta', icon: Dices },
  { id: 'nosotros', label: 'Nosotros', icon: Heart },
]

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <motion.p
        className="font-serif text-5xl font-light"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ repeat: Infinity, duration: 1.8 }}
      >
        BEDO
      </motion.p>
    </div>
  )
}

function Shell() {
  const { ready, settings } = useStore()
  const { tab, sub } = useRoute()
  const [settingsOpen, setSettingsOpen] = useState<false | 'all' | 'frame'>(false)

  useEffect(() => {
    document.title = settings.title || 'BEDO'
  }, [settings.title])

  const go = (t: Tab) => navigate(t)

  if (!ready) return <Splash />

  const names = [settings.nameA, settings.nameB].filter(Boolean).join(' & ')
  const days = settings.since ? daysSince(settings.since) : null

  return (
    <div className="relative min-h-dvh [--rail:0px] lg:[--rail:128px] xl:[--rail:168px] 2xl:[--rail:200px]">
      <FrameRails />

      <div className="relative z-[1] lg:px-[var(--rail)]">
        <header className="mx-auto max-w-5xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-serif text-3xl leading-none font-light tracking-tight sm:text-4xl">
                {settings.title || 'BEDO'}
              </p>
              <button
                onClick={() => setSettingsOpen('all')}
                className="mt-1.5 block max-w-full truncate text-left text-sm text-muted transition hover:text-ink"
              >
                {names || days !== null ? (
                  <>
                    {names}
                    {names && days !== null && <span className="mx-1.5 text-muted/50">·</span>}
                    {days !== null && (
                      <span className="tabular-nums">
                        {days.toLocaleString('es-CL')} {days === 1 ? 'día' : 'días'} juntos
                      </span>
                    )}
                  </>
                ) : (
                  'Agregar sus nombres →'
                )}
              </button>
            </div>

            <nav className="hidden items-center gap-1 rounded-full border border-line bg-card p-1 shadow-soft md:flex">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => go(t.id)}
                  className={cn(
                    'relative flex h-9 items-center gap-2 rounded-full px-3 text-sm transition lg:px-4',
                    tab === t.id ? 'text-paper' : 'text-ink-soft hover:text-ink',
                  )}
                >
                  {tab === t.id && (
                    <motion.span
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-full bg-ink"
                      transition={{ type: 'spring', damping: 30, stiffness: 380 }}
                    />
                  )}
                  <t.icon size={16} strokeWidth={1.75} className="relative" />
                  <span className={cn('relative', tab !== t.id && 'hidden lg:inline')}>{t.label}</span>
                </button>
              ))}
            </nav>

            <button className="btn-icon" onClick={() => setSettingsOpen('all')} aria-label="Ajustes">
              <Gear size={20} strokeWidth={1.75} />
            </button>
          </div>
        </header>

        <div className="mx-auto mt-3 max-w-5xl sm:px-2">
          <FrameStrip onEdit={() => setSettingsOpen('frame')} />
        </div>

        <main className="mx-auto max-w-5xl px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {tab === 'inicio' && <Home />}
              {tab === 'album' && <Album sub={sub} />}
              {tab === 'planes' && <Plans sub={sub} />}
              {tab === 'ruleta' && <Roulette />}
              {tab === 'nosotros' && <Nosotros sub={sub} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Navegación inferior en celular */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-card/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 pt-2.5 pb-2 text-[10.5px] transition',
                tab === t.id ? 'text-ink' : 'text-muted',
              )}
            >
              <span
                className={cn(
                  'grid h-8 w-12 place-items-center rounded-full transition',
                  tab === t.id && 'bg-sand',
                )}
              >
                <t.icon size={20} strokeWidth={tab === t.id ? 2 : 1.6} />
              </span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <SettingsSheet
        open={!!settingsOpen}
        section={settingsOpen === 'frame' ? 'frame' : undefined}
        onClose={() => setSettingsOpen(false)}
      />
      <Toasts />
    </div>
  )
}

function CloudGate({ sb }: { sb: SupabaseClient }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const backend = useMemo(() => createSupabaseBackend(sb), [sb])

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [sb])

  if (session === undefined) return <Splash />
  if (!session) return <Login sb={sb} />
  return (
    <StoreProvider key={session.user.id} backend={backend} signOut={() => sb.auth.signOut()}>
      <Shell />
    </StoreProvider>
  )
}

export default function App() {
  if (supabase) return <CloudGate sb={supabase} />
  return (
    <StoreProvider backend={localBackend}>
      <Shell />
    </StoreProvider>
  )
}
