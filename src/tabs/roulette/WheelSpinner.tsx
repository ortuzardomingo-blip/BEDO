import { useRef, useState } from 'react'

const TONES = [
  { fill: '#1d1b19', text: '#f6f3ee' },
  { fill: '#efe9e0', text: '#1d1b19' },
  { fill: '#b5654a', text: '#ffffff' },
  { fill: '#fffdfa', text: '#1d1b19' },
]

const S = 400
const C = S / 2
const R = 192

const mod = (x: number, m: number) => ((x % m) + m) % m
const pt = (deg: number, r = R) => {
  const a = (deg * Math.PI) / 180
  return [C + r * Math.sin(a), C - r * Math.cos(a)]
}

function tone(i: number, n: number) {
  if (n > 1 && i === n - 1 && i % 4 === 0) return TONES[1]
  return TONES[i % 4]
}

function fontSize(n: number) {
  if (n <= 6) return 17
  if (n <= 10) return 14
  if (n <= 16) return 12
  if (n <= 24) return 10.5
  return 9
}

function clip(s: string, n: number) {
  const max = n <= 10 ? 20 : n <= 18 ? 18 : 15
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

export function WheelSpinner({
  options,
  onStart,
  onResult,
}: {
  options: string[]
  onStart?: () => void
  onResult: (value: string) => void
}) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const pending = useRef<number | null>(null)
  const n = options.length
  const seg = 360 / Math.max(n, 1)

  const spin = () => {
    if (spinning || n < 2) return
    const idx = Math.floor(Math.random() * n)
    const mid = (idx + 0.5) * seg
    const jitter = (Math.random() - 0.5) * seg * 0.7
    const target = mod(-(mid + jitter), 360)
    const turns = 6 + Math.floor(Math.random() * 3)
    let next = rotation - mod(rotation, 360) + turns * 360 + target
    if (next - rotation < 360 * 5) next += 360
    pending.current = idx
    setSpinning(true)
    onStart?.()
    setRotation(next)
  }

  const finish = () => {
    if (pending.current == null) return
    const v = options[pending.current]
    pending.current = null
    setSpinning(false)
    navigator.vibrate?.([20, 40, 20])
    if (v) onResult(v)
  }

  const fs = fontSize(n)

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(88vw,440px)] select-none">
      {/* Indicador */}
      <div className="absolute -top-1 left-1/2 z-10 -translate-x-1/2 drop-shadow-md">
        <svg width="28" height="34" viewBox="0 0 28 34">
          <path d="M14 33 L2 8 A14 14 0 0 1 26 8 Z" fill="#1d1b19" />
          <circle cx="14" cy="11" r="4" fill="#f6f3ee" />
        </svg>
      </div>

      <div className="absolute inset-0 rounded-full bg-card p-2 shadow-lift">
        <div
          className="size-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 5.2s cubic-bezier(0.12, 0.72, 0.1, 1)' : 'none',
          }}
          onTransitionEnd={finish}
        >
          <svg viewBox={`0 0 ${S} ${S}`} className="size-full">
            {n === 0 && <circle cx={C} cy={C} r={R} fill="#efe9e0" />}
            {n === 1 && <circle cx={C} cy={C} r={R} fill={TONES[0].fill} />}
            {n > 1 &&
              options.map((o, i) => {
                const [x0, y0] = pt(i * seg)
                const [x1, y1] = pt((i + 1) * seg)
                const large = seg > 180 ? 1 : 0
                return (
                  <path
                    key={i}
                    d={`M${C} ${C} L${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`}
                    fill={tone(i, n).fill}
                    stroke="#fffdfa"
                    strokeWidth={1.5}
                  >
                    <title>{o}</title>
                  </path>
                )
              })}
            {options.map((o, i) => {
              const mid = (i + 0.5) * seg
              // En la mitad izquierda giramos el texto 180° para que no quede de cabeza
              const flip = n > 1 && mid > 180
              return (
                <g key={i} transform={`rotate(${flip ? mid + 90 : mid - 90} ${C} ${C})`}>
                  <text
                    x={flip ? C - R + 16 : C + R - 16}
                    y={C}
                    textAnchor={flip ? 'start' : 'end'}
                    dominantBaseline="central"
                    fontSize={fs}
                    fontFamily="Inter, system-ui, sans-serif"
                    fontWeight={500}
                    fill={n === 1 ? TONES[0].text : tone(i, n).text}
                  >
                    {clip(o, n)}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      <button
        onClick={spin}
        disabled={spinning || n < 2}
        className="absolute top-1/2 left-1/2 z-10 grid size-[22%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-paper bg-card font-serif text-lg shadow-lift transition hover:scale-105 active:scale-95 disabled:cursor-default disabled:hover:scale-100 sm:text-xl"
      >
        {spinning ? '…' : 'Girar'}
      </button>
    </div>
  )
}
