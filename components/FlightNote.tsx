'use client'

import { useEffect, useState } from 'react'

type Body = {
  what_it_isolated: string
  what_the_contrast_shows: string
  what_to_carry_forward: string
}

export function FlightNote({ sessionId }: { sessionId: string }) {
  const [body, setBody] = useState<Body | null>(null)
  const [pending, setPending] = useState<{ done: number; total: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch('/api/flight', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (cancelled) return
      const json = await res.json()
      if (res.ok) setBody(json)
      else if (json.total) setPending({ done: json.done, total: json.total })
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  if (pending) {
    return (
      <p className="text-[15px] font-semibold leading-relaxed text-sub text-pretty">
        The comparison opens once you&rsquo;ve written all {pending.total} bottles — you&rsquo;re at{' '}
        {pending.done}. Telling you what the contrast is now would decide the note you
        haven&rsquo;t made yet.
      </p>
    )
  }
  if (!body) return <p className="text-[15px] font-semibold text-muted">Working it out…</p>

  return (
    <div className="folder"><div className="folder-body gap-4">
      <div>
        <h3 className="eyebrow">What it isolated</h3>
        <p className="mt-1 text-[16px] leading-relaxed text-pretty">{body.what_it_isolated}</p>
      </div>
      <div>
        <h3 className="eyebrow">What the contrast shows</h3>
        <p className="mt-1 text-[16px] leading-relaxed text-pretty">{body.what_the_contrast_shows}</p>
      </div>
      <div>
        <h3 className="eyebrow">Carry forward</h3>
        <p className="mt-1 text-[16px] leading-relaxed text-pretty">{body.what_to_carry_forward}</p>
      </div>
    </div></div>
  )
}
