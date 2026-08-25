'use client'

import { useEffect, useState } from 'react'

type Check = {
  axis: string
  your_call: string
  reference: string
  verdict: 'matches' | 'too low' | 'too high'
  note: string
}

type Body = {
  what_youre_drinking: string
  structure_check: Check[]
  why_it_tastes_like_this: string
  flavor_reflection: string
}

const VERDICT_STYLE: Record<Check['verdict'], string> = {
  matches: 'border-line text-muted',
  'too low': 'border-wine text-wine',
  'too high': 'border-wine text-wine',
}

export function Explanation({ bottleId }: { bottleId: string }) {
  const [body, setBody] = useState<Body | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bottleId }),
      })
      if (cancelled) return
      if (!res.ok) {
        setError('Could not put that together. Pull down to try again.')
        return
      }
      setBody(await res.json())
    })()
    return () => {
      cancelled = true
    }
  }, [bottleId])

  if (error) return <p className="text-[15px] text-wine">{error}</p>
  if (!body) return <p className="text-[15px] text-muted">Working it out…</p>

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[17px] leading-relaxed">{body.what_youre_drinking}</p>

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] uppercase tracking-wide text-muted">Your structure calls</h3>
        {body.structure_check.map((c) => (
          <div key={c.axis} className={`rounded-lg border-l-2 pl-3 ${VERDICT_STYLE[c.verdict]}`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium capitalize text-ink">{c.axis}</span>
              <span className="text-[14px]">
                you said {c.your_call} · {c.reference}
              </span>
            </div>
            <p className="mt-0.5 text-[15px] leading-relaxed text-ink">{c.note}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-1.5">
        <h3 className="text-[13px] uppercase tracking-wide text-muted">Why it tastes like this</h3>
        <p className="text-[16px] leading-relaxed">{body.why_it_tastes_like_this}</p>
      </section>

      <section className="flex flex-col gap-1.5">
        <h3 className="text-[13px] uppercase tracking-wide text-muted">Your words</h3>
        <p className="text-[16px] leading-relaxed">{body.flavor_reflection}</p>
      </section>
    </div>
  )
}
