import { NextResponse } from 'next/server'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { anthropic, MODEL } from '@/lib/anthropic'
import { currentTaster } from '@/lib/auth'
import { sql } from '@/lib/db'
import type { Bottle, Note, Session } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The verdict is an enum, not prose, so "says which direction" is structural
 * rather than something we hope the paragraph got around to. The failure mode
 * this exists to prevent is an explanation that won't say "you called this
 * medium acid and it isn't."
 */
const StructureCheck = z.object({
  axis: z.string(),
  your_call: z.string(),
  reference: z.string(),
  verdict: z.enum(['matches', 'too low', 'too high']),
  note: z.string(),
})

const ExplanationSchema = z.object({
  what_youre_drinking: z.string(),
  structure_check: z.array(StructureCheck),
  why_it_tastes_like_this: z.string(),
  flavor_reflection: z.string(),
})

const SYSTEM = `You explain a wine to someone who has just written their own tasting note on it, and who is learning. They already know what the bottle is — they read the label. Your job is not to reveal, it is to explain.

Write four things.

**what_youre_drinking** — grape, place, style, in plain words. Two or three sentences. No score-magazine prose, no "notes of," no numerical rating, no adjective stacking. Say what it is the way you'd say it to a friend across the table.

**structure_check** — one entry per structure axis they called. For each: their call, a defensible reference value for this wine, and a verdict.

This is the part that matters, so do it honestly. A Muscadet really is high-acid. A young Nebbiolo really is grippy. If they marked either one medium, the verdict is "too low" and you say so plainly in the note. Do not soften it into "you might consider." Do not call a wrong answer "close." Do not congratulate.

Verdict is "matches" only when their call genuinely sits at the reference. Adjacent is not matching — if the reference is high and they said medium+, that is "too low," and the note should say it's one step off rather than treating it as a miss of the same size as medium. Be specific about the size of the gap.

Where the reference genuinely spans a range, or the vintage or producer style moves it, say that — an honest "this one is borderline, both medium+ and high are defensible" is not the same as softening a real miss.

**why_it_tastes_like_this** — the causes. Cool versus warm climate, stainless versus oak, malolactic or not, age, whatever actually drives this wine's profile. Connect it back to the structure numbers above: the acid is high *because* of something. This is the part that makes the next bottle easier to read.

**flavor_reflection** — reflect their flavor words back and group them. If they wrote green apple, lemon, and chalk, name that as a citrus-and-mineral cluster and say what in the winemaking tends to produce it.

Never grade a flavor descriptor. "I taste green apple" is not right or wrong, and you have no authority to say otherwise. Do not say a descriptor is accurate, apt, classic, spot-on, or unusual for the wine. Do not say they missed one. Do not praise their palate. Group the words, connect them to cause where there is a real connection, and stop.

The distinction is absolute: structure gets checked, flavor never gets graded.`

function describeNote(n: Note): string {
  return [
    `nose intensity: ${n.nose_intensity ?? '—'}`,
    `sweetness: ${n.sweetness ?? '—'}`,
    `acidity: ${n.acidity ?? '—'}`,
    `tannin: ${n.tannin ?? '—'}`,
    `body: ${n.body ?? '—'}`,
    `alcohol: ${n.alcohol ?? '—'}`,
    `finish: ${n.finish ?? '—'}`,
  ].join('\n')
}

function describeBottle(b: Bottle): string {
  return [
    b.producer && `producer: ${b.producer}`,
    b.wine && `cuvée: ${b.wine}`,
    b.grape && `grape: ${b.grape}`,
    b.region && `region: ${b.region}`,
    b.country && `country: ${b.country}`,
    b.vintage && `vintage: ${b.vintage}`,
    b.abv && `abv: ${b.abv}%`,
  ]
    .filter(Boolean)
    .join('\n')
}

export async function POST(req: Request) {
  const taster = await currentTaster()
  if (!taster) return NextResponse.json({ error: 'not signed in' }, { status: 401 })

  const { bottleId } = await req.json()
  if (typeof bottleId !== 'string') {
    return NextResponse.json({ error: 'bottleId required' }, { status: 400 })
  }

  // The one rule. This taster gets nothing for this bottle until this taster
  // has written their own note for it. One check, not a security boundary.
  const notes = (await sql`
    select * from notes where bottle_id = ${bottleId} and taster = ${taster}
  `) as Note[]
  const note = notes[0]
  if (!note) {
    return NextResponse.json({ error: 'note not submitted' }, { status: 404 })
  }

  const cached = (await sql`
    select body from explanations where bottle_id = ${bottleId} and taster = ${taster}
  `) as { body: unknown }[]
  if (cached[0]) return NextResponse.json(cached[0].body)

  const bottles = (await sql`
    select * from bottles where id = ${bottleId}
  `) as Bottle[]
  const bottle = bottles[0]
  if (!bottle) return NextResponse.json({ error: 'no such bottle' }, { status: 404 })

  const sessions = (await sql`
    select * from sessions where id = ${bottle.session_id}
  `) as Session[]
  const session = sessions[0]

  const prompt = `The bottle:
${describeBottle(bottle)}

${session?.focus ? `What this flight is testing: ${session.focus}\n` : ''}
Their structure calls:
${describeNote(note)}

Their nose words: ${note.nose_words.join(', ') || '(none)'}
Their palate words: ${note.palate_words.join(', ') || '(none)'}
${note.takeaway ? `\nTheir takeaway: ${note.takeaway}` : ''}`

  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: zodOutputFormat(ExplanationSchema) },
  })

  if (!response.parsed_output) {
    return NextResponse.json({ error: 'could not generate explanation' }, { status: 502 })
  }

  const body = response.parsed_output
  await sql`
    insert into explanations (bottle_id, taster, body)
    values (${bottleId}, ${taster}, ${JSON.stringify(body)})
    on conflict (bottle_id, taster) do nothing
  `

  return NextResponse.json(body)
}
