import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import { nextSessionNumber } from '@/lib/queries'
import type { Session } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'not signed in' }, { status: 401 })

  const { number, module, focus, bottles } = await req.json()
  if (!Array.isArray(bottles) || bottles.length === 0) {
    return NextResponse.json({ error: 'at least one bottle' }, { status: 400 })
  }
  if (bottles.length > 12) {
    return NextResponse.json({ error: 'that is a lot of bottles' }, { status: 400 })
  }

  const created = (await sql`
    insert into sessions (group_id, number, module, focus)
    values (
      ${user.groupId},
      ${number ?? (await nextSessionNumber(user.groupId))},
      ${module ?? null},
      ${focus ?? null}
    )
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

/** Next session number for this group, so /session/new can prefill it. */
export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'not signed in' }, { status: 401 })
  return NextResponse.json({ next: await nextSessionNumber(user.groupId) })
}
