import { useState, type FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { motion } from 'motion/react'

export function Login({ sb }: { sb: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError('Correo o contraseña incorrectos')
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <h1 className="text-center font-serif text-6xl font-light tracking-tight">BEDO</h1>
        <p className="mt-2 text-center text-sm text-muted">Nuestro rincón. Entra para continuar.</p>
        <div className="card mt-8 space-y-4 p-6">
          <div>
            <label className="label" htmlFor="em">
              Correo
            </label>
            <input
              id="em"
              type="email"
              autoComplete="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="pw">
              Contraseña
            </label>
            <input
              id="pw"
              type="password"
              autoComplete="current-password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-accent">{error}</p>}
          <button className="btn-primary h-12 w-full text-base" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </motion.form>
    </div>
  )
}
