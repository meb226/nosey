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
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col bg-gradient-to-b from-groundtop to-ground to-[46%]">
      <form onSubmit={submit} className="flex flex-col gap-6 px-5 pb-6 pt-16">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[46px] font-extrabold leading-[0.95] tracking-[-0.04em] text-headline">
            Nosey
          </h1>
          <p className="text-[16px] font-semibold text-sub text-pretty">
            Write it down first. Then find out what it was.
          </p>
        </div>

        <div className="folder">
          <div className="folder-body gap-4">
            <label className="flex flex-col gap-2">
              <span className="eyebrow">Who are you</span>
              <input
                className="field min-h-[50px]"
                value={taster}
                onChange={(e) => setTaster(e.target.value)}
                autoCapitalize="words"
                autoComplete="given-name"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="eyebrow">Passphrase</span>
              <input
                className="field min-h-[50px]"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {error && <p className="text-[15px] font-semibold text-ink">{error}</p>}
          </div>
        </div>

        <button className="btn" disabled={busy}>
          {busy ? 'One moment' : 'Start'}
        </button>

        <p className="text-[14px] font-medium leading-relaxed text-sub text-pretty">
          For the full-screen version: tap Share, then Add to Home Screen. iOS has no install
          prompt, so it has to be done by hand — once per phone.
        </p>
      </form>
    </main>
  )
}
