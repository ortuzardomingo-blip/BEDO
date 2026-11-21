import { useEffect, useState } from 'react'

export type Tab = 'inicio' | 'album' | 'planes' | 'ruleta' | 'nosotros'
export const TAB_IDS: Tab[] = ['inicio', 'album', 'planes', 'ruleta', 'nosotros']

function parse(): { tab: Tab; sub: string } {
  const [t, s = ''] = location.hash.slice(1).split('/')
  return { tab: TAB_IDS.includes(t as Tab) ? (t as Tab) : 'inicio', sub: s }
}

/** Navega a una pestaña (y subsección). Usa el historial: el botón "atrás" funciona. */
export function navigate(tab: Tab, sub = '') {
  const hash = `#${tab}${sub ? '/' + sub : ''}`
  if (location.hash === hash) return
  const sameTab = parse().tab === tab
  location.hash = hash
  if (!sameTab) window.scrollTo({ top: 0 })
}

export function useRoute() {
  const [r, setR] = useState(parse)
  useEffect(() => {
    const on = () => setR(parse())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}
