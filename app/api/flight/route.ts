import { NextResponse } from 'next/server'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { anthropic, MODEL } from '@/lib/anthropic'
import { currentUser } from '@/lib/auth'
import { checkRate } from '@/lib/rateLimit'
import { sql } from '@/lib/db'
import { groupForSession } from '@/lib/queries'
import type { Bottle, Note, Session } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FlightSchema = z.object({
  what_it_isolated: z.string(),
  what_the_contrast_shows: z.string(),
  what_to_carry_forward: z.string(),
})

const SYSTEM = `Two bottles were poured side by side to isolate one variable. The taster has now written their own note on both. Explain the comparison.

**what_it_isolated** — name the single variable the flight held everything else constant to test. Climate, oak, age, soil, winemaking choice. One or two sentences, plainly stated.

**what_the_contrast_shows** — what the two wines' structure actually demonstrates about that variable. Refer to their own calls on both bottles. Where their two notes already show the contrast, point at it: "you marked the first medium+ acid and the second high, and that gap is the whole lesson." Where their notes flattened a real difference, say that just as plainly.

**what_to_carry_forward** — the one thing that makes the next unfamiliar bottle easier to read. Concrete and small. Not a summary of what you just said.

Do not grade their flavor descriptors here either. Structure and cause only.`

export async function POST(req: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'not signed in' }, { status: 401 })

  const rate = await checkRate(user.id, 'flight')
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'slow down a moment' },
      { status: 429, headers: { 'retry-after': String(rate.retryAfter) } },
    )
  }

  const { sessionId } = await req.json()
  if (typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  if ((await groupForSession(sessionId)) !== user.groupId) {
    return NextResponse.json({ error: 'no such session' }, { status: 404 })
  }

  const bottles = (await sql`
    select * from bottles where session_id = ${sessionId} order by position
  `) as Bottle[]
  if (bottles.length < 2) {
    return NextResponse.json({ error: 'not a flight' }, { status: 400 })
  }

  const notes = (await sql`
    select n.* from notes n
    join bottles b on b.id = n.bottle_id
    where b.session_id = ${sessionId} and n.user_id = ${user.id}
  `) as Note[]

  // Unlocks only once this taster has written every bottle. Showing the
  // contrast earlier would tell them what to find in a wine they haven't
  // tasted yet, which is the one thing this app exists to prevent.
  if (notes.length < bottles.length) {
    return NextResponse.json(
      { error: 'not all bottles submitted', done: notes.length, total: bottles.length },
      { status: 404 },
    )
  }

  const cached = (await sql`
    select body from flight_notes where session_id = ${sessionId} and user_id = ${user.id}
  `) as { body: unknown }[]
  if (cached[0]) return NextResponse.json(cached[0].body)

  const sessions = (await sql`select * from sessions where id = ${sessionId}`) as Session[]
  const session = sessions[0]
  const byBottle = new Map(notes.map((n) => [n.bottle_id, n]))

  const prompt = `${session?.focus ? `What this flight was testing: ${session.focus}\n\n` : ''}${bottles
    .map((b, i) => {
      const n = byBottle.get(b.id)!
      return `Bottle ${i + 1}: ${[b.producer, b.wine, b.vintage].filter(Boolean).join(' ')}
${[b.grape && `grape: ${b.grape}`, b.region && `region: ${b.region}`, b.abv && `abv: ${b.abv}%`].filter(Boolean).join(', ')}
Their calls — nose ${n.nose_intensity ?? '—'}, ${n.sweetness ?? '—'}, acid ${n.acidity ?? '—'}, tannin ${n.tannin ?? '—'}, body ${n.body ?? '—'}, alcohol ${n.alcohol ?? '—'}, finish ${n.finish ?? '—'}
Their words — nose: ${n.nose_words.join(', ') || '(none)'}; palate: ${n.palate_words.join(', ') || '(none)'}`
    })
    .join('\n\n')}`

  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: zodOutputFormat(FlightSchema) },
  })

  if (!response.parsed_output) {
    return NextResponse.json({ error: 'could not generate comparison' }, { status: 502 })
  }

  const body = response.parsed_output
  await sql`
    insert into flight_notes (session_id, user_id, body)
    values (${sessionId}, ${user.id}, ${JSON.stringify(body)})
    on conflict (session_id, user_id) do nothing
  `

  return NextResponse.json(body)
}
