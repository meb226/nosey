import { NextResponse } from 'next/server'
import { currentTaster } from '@/lib/auth'
import { sql } from '@/lib/db'
import type { Session } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const taster = await currentTaster()
  if (!taster) return NextResponse.json({ error: 'not signed in' }, { status: 401 })

  const { number, module, focus, bottles } = await req.json()
  if (!Array.isArray(bottles) || bottles.length === 0) {
    return NextResponse.json({ error: 'at least one bottle' }, { status: 400 })
  }

  const created = (await sql`
    insert into sessions (number, module, focus)
    values (${number ?? null}, ${module ?? null}, ${focus ?? null})
    returning *
  `) as Session[]
  const session = created[0]

  for (const [i, b] of bottles.entries()) {
    await sql`
      insert into bottles (
        session_id, position, producer, wine, grape, region, country,
        vintage, abv, price, retailer, label_photo_url
      ) values (
        ${session.id}, ${i + 1}, ${b.producer ?? null}, ${b.wine ?? null},
        ${b.grape ?? null}, ${b.region ?? null}, ${b.country ?? null},
        ${b.vintage ?? null}, ${b.abv ?? null}, ${b.price ?? null},
        ${b.retailer ?? null}, ${b.label_photo_url ?? null}
      )
    `
  }

  return NextResponse.json({ id: session.id })
}

/** Next session number, so /session/new can prefill it. */
export async function GET() {
  const taster = await currentTaster()
  if (!taster) return NextResponse.json({ error: 'not signed in' }, { status: 401 })

  const rows = (await sql`select coalesce(max(number), 0) + 1 as next from sessions`) as {
    next: number
  }[]
  return NextResponse.json({ next: rows[0].next })
}
