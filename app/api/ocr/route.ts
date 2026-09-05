import { NextResponse } from 'next/server'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { anthropic, MODEL } from '@/lib/anthropic'
import { currentUser } from '@/lib/auth'
import { checkRate } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * OCR proposes, the taster confirms. Every field here lands in an editable
 * input on /session/new — nothing commits without a human look.
 * Nullable throughout: a label that doesn't state ABV should come back null,
 * not with a plausible guess.
 */
const LabelSchema = z.object({
  producer: z.string().nullable(),
  wine: z.string().nullable(),
  grape: z.string().nullable(),
  region: z.string().nullable(),
  country: z.string().nullable(),
  vintage: z.number().int().nullable(),
  abv: z.number().nullable(),
})

const SYSTEM = `You read wine labels and transcribe what is printed.

Return only what the label actually shows. If a field is not printed, return null for it — do not infer, complete, or guess from your own knowledge of the producer.

Two exceptions, because labels routinely omit them by regional convention:
- grape: if the appellation legally implies the variety (Chablis is Chardonnay, Sancerre is Sauvignon Blanc, Barolo is Nebbiolo), fill it in.
- country: infer from the region.

Transcribe the producer and cuvée as printed, without translating or expanding them.`

export async function POST(req: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'not signed in' }, { status: 401 })

  // Every OCR call is a vision request plus a blob write and nothing about it
  // is cached, so this is the endpoint a runaway loop would hurt.
  const rate = await checkRate(user.id, 'ocr')
  if (!rate.ok) {
    return NextResponse.json(
      { error: `that is ${rate.limit} labels in an hour — give it a minute` },
      { status: 429, headers: { 'retry-after': String(rate.retryAfter) } },
    )
  }

  const { imageUrl } = await req.json()
  if (typeof imageUrl !== 'string' || !imageUrl) {
    return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })
  }

  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: imageUrl } },
          { type: 'text', text: 'Transcribe this wine label.' },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(LabelSchema) },
  })

  // parsed_output is null when the model's output failed schema validation.
  // Surface that rather than shipping a half-filled form the taster trusts.
  if (!response.parsed_output) {
    return NextResponse.json({ error: 'could not read label' }, { status: 422 })
  }

  return NextResponse.json(response.parsed_output)
}
