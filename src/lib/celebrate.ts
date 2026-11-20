export async function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const { default: confetti } = await import('canvas-confetti')
  const colors = ['#1d1b19', '#b5654a', '#d9cbbb', '#efe9e0']
  const base = { colors, ticks: 220, gravity: 0.9, scalar: 0.9, zIndex: 5000, disableForReducedMotion: true }
  confetti({ ...base, particleCount: 60, spread: 70, origin: { x: 0.3, y: 0.7 }, angle: 60 })
  confetti({ ...base, particleCount: 60, spread: 70, origin: { x: 0.7, y: 0.7 }, angle: 120 })
  navigator.vibrate?.(30)
}
