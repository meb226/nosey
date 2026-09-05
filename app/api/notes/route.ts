import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth'
import { groupForBottle } from '@/lib/queries'
import { sql } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * One bottle, written on completion rather than submit-all. Killing the tab
 * — or iOS pull-to-refresh firing mid-session — loses at most one bottle.
 *
 * UNIQUE (bottle_id, user_id) means two people submitting at the same instant
 * produce two rows. The upsert is on that key, so editing your own note
 * overwrites only your row and never touches anyone else's — and because the
 * key is an id rather than a typed name, nobody lands on your row by entering
 * your name.
 */
export async function POST(req: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'not signed in' }, { status: 401 })

  const n = await req.json()
  if (typeof n?.bottle_id !== 'string') {
    return NextResponse.json({ error: 'bottle_id required' }, { status: 400 })
  }

  // A bottle id is a uuid, not a secret. Without this, anyone signed in could
  // write a note onto another group's bottle by guessing one.
  if ((await groupForBottle(n.bottle_id)) !== user.groupId) {
    return NextResponse.json({ error: 'no such bottle' }, { status: 404 })
  }

  const rows = (await sql`
    insert into notes (
      bottle_id, user_id, nose_intensity, sweetness, acidity, tannin, body,
      alcohol, finish, nose_words, palate_words, score, buy_again, drink_with,
      favourite, takeaway
    ) values (
      ${n.bottle_id}, ${user.id}, ${n.nose_intensity ?? null}, ${n.sweetness ?? null},
      ${n.acidity ?? null}, ${n.tannin ?? null}, ${n.body ?? null},
      ${n.alcohol ?? null}, ${n.finish ?? null}, ${n.nose_words ?? []},
      ${n.palate_words ?? []}, ${n.score ?? null}, ${n.buy_again ?? null},
      ${n.drink_with ?? null}, ${n.favourite ?? false}, ${n.takeaway ?? null}
    )
    on conflict (bottle_id, user_id) do update set
      nose_intensity = excluded.nose_intensity,
      sweetness      = excluded.sweetness,
      acidity        = excluded.acidity,
      tannin         = excluded.tannin,
      body           = excluded.body,
      alcohol        = excluded.alcohol,
      finish         = excluded.finish,
      nose_words     = excluded.nose_words,
      palate_words   = excluded.palate_words,
      score          = excluded.score,
      buy_again      = excluded.buy_again,
      drink_with     = excluded.drink_with,
      favourite      = excluded.favourite,
      takeaway       = excluded.takeaway
    returning id
  `) as { id: string }[]

  return NextResponse.json({ id: rows[0].id })
}
