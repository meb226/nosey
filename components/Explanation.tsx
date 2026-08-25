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

/**
 * A miss gets a filled amber tag and a firm rule; a match gets a hairline and
 * nothing else. The difference has to survive being read at a glance, because
 * the whole point of the structure check is that you notice when a call is off.
 */
const VERDICT_STYLE: Record<Check['verdict'], { rule: string; tag: string }> = {
  matches: { rule: 'border-hairline', tag: 'border-hairline bg-white text-muted' },
  'too low': { rule: 'border-ink', tag: 'border-ink bg-amber text-ink' },
  'too high': { rule: 'border-ink', tag: 'border-ink bg-amber text-ink' },
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

  if (error) return <p className="text-[15px] font-semibold text-ink">{error}</p>
  if (!body) return <p className="text-[15px] font-semibold text-muted">Working it out…</p>

  return (
    <div className="folder"><div className="folder-body gap-5">
      <p className="text-[17px] leading-relaxed text-pretty">{body.what_youre_drinking}</p>

      <section className="flex flex-col gap-2">
        <h3 className="eyebrow">Your structure calls</h3>
        {body.structure_check.map((c) => (
          <div
            key={c.axis}
            className={`flex flex-col gap-1 border-l-[3px] pl-3 ${VERDICT_STYLE[c.verdict].rule}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[16px] font-bold capitalize text-ink">{c.axis}</span>
              <span
                className={`rounded-full border-2 px-2 py-0.5 text-[12px] font-bold uppercase tracking-[0.04em] ${VERDICT_STYLE[c.verdict].tag}`}
              >
                {c.verdict}
              </span>
            </div>
            <span className="text-[14px] font-medium text-muted">
              you said {c.your_call} · reference {c.reference}
            </span>
            <p className="text-[15px] leading-relaxed text-ink text-pretty">{c.note}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-1.5">
        <h3 className="eyebrow">Why it tastes like this</h3>
        <p className="text-[16px] leading-relaxed text-pretty">{body.why_it_tastes_like_this}</p>
      </section>

      <section className="flex flex-col gap-1.5">
        <h3 className="eyebrow">Your words</h3>
        <p className="text-[16px] leading-relaxed text-pretty">{body.flavor_reflection}</p>
      </section>
    </div></div>
  )
}
