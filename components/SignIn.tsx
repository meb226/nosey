'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SignIn() {
  const router = useRouter()
  const [taster, setTaster] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ taster, passphrase }),
    })
    if (res.ok) {
      router.refresh()
    } else {
      setError((await res.json()).error ?? 'try again')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-sm flex-col gap-4 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold">Wino</h1>
        <p className="mt-1 text-[15px] text-muted">
          Write it down first. Then find out what it was.
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] uppercase tracking-wide text-muted">Who are you</span>
        <input
          className="field"
          value={taster}
          onChange={(e) => setTaster(e.target.value)}
          autoCapitalize="words"
          autoComplete="given-name"
          required
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] uppercase tracking-wide text-muted">Passphrase</span>
        <input
          className="field"
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>

      {error && <p className="text-[15px] text-wine">{error}</p>}

      <button className="btn mt-2" disabled={busy}>
        {busy ? 'One moment' : 'Start'}
      </button>

      <p className="mt-6 text-[13px] leading-relaxed text-muted">
        Add this to your home screen for the full-screen version: tap Share, then Add to Home
        Screen. iOS has no install prompt, so it has to be done by hand — once per phone.
      </p>
    </form>
  )
}
