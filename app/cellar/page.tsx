import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentTaster } from '@/lib/auth'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Row = {
  bottle_id: string
  session_id: string
  session_number: number
  producer: string | null
  wine: string | null
  grape: string | null
  region: string | null
  country: string | null
  vintage: number | null
  score: number | null
  favourite: boolean
  takeaway: string | null
  created_at: string
}

export default async function Cellar({
  searchParams,
}: {
  searchParams: Promise<{ grape?: string; country?: string; fav?: string; q?: string }>
}) {
  const taster = await currentTaster()
  if (!taster) redirect('/')

  const { grape, country, fav, q } = await searchParams
  const onlyFavourites = fav === '1'
  const query = q?.trim() || null

  const rows = (await sql`
    select b.id as bottle_id, b.session_id, s.number as session_number,
           b.producer, b.wine, b.grape, b.region, b.country, b.vintage,
           n.score, coalesce(n.favourite, false) as favourite, n.takeaway, s.created_at
    from bottles b
    join sessions s on s.id = b.session_id
    left join notes n on n.bottle_id = b.id and n.taster = ${taster}
    where (${grape ?? null}::text is null or b.grape = ${grape ?? null})
      and (${country ?? null}::text is null or b.country = ${country ?? null})
      and (${onlyFavourites} = false or n.favourite = true)
      and (${query}::text is null or (
        coalesce(b.producer, '') || ' ' || coalesce(b.wine, '') || ' ' ||
        coalesce(b.grape, '') || ' ' || coalesce(b.region, '') || ' ' ||
        coalesce(b.country, '') || ' ' || coalesce(n.takeaway, '')
      ) ilike '%' || ${query} || '%')
    order by s.created_at desc, b.position
  `) as Row[]

  const grapes = [...new Set(rows.map((r) => r.grape).filter(Boolean))] as string[]

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-5 px-6 py-10">
      <h1 className="text-2xl font-semibold">My cellar</h1>

      <form action="/cellar" className="flex flex-col gap-1.5">
        <input
          name="q"
          defaultValue={query ?? ''}
          placeholder="Grape, region, a word you wrote"
          className="field"
          autoCapitalize="none"
          autoCorrect="off"
        />
      </form>

      <div className="flex flex-wrap gap-1.5">
        <Link
          href={onlyFavourites ? '/cellar' : '/cellar?fav=1'}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[15px] ${onlyFavourites ? 'border-wine bg-wine text-white' : 'border-line bg-white'}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill={onlyFavourites ? 'currentColor' : 'none'}>
            <polygon points="12 2.6 15 9 22 9.9 17 14.7 18.2 21.6 12 18.3 5.8 21.6 7 14.7 2 9.9 9 9" />
          </svg>
          Favourites
        </Link>
      </div>

      {grapes.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <Link
            href="/cellar"
            className={`rounded-full border px-3 py-1.5 text-[15px] ${!grape ? 'border-wine bg-wine text-white' : 'border-line bg-white'}`}
          >
            All
          </Link>
          {grapes.map((g) => (
            <Link
              key={g}
              href={`/cellar?grape=${encodeURIComponent(g)}`}
              className={`rounded-full border px-3 py-1.5 text-[15px] ${grape === g ? 'border-wine bg-wine text-white' : 'border-line bg-white'}`}
            >
              {g}
            </Link>
          ))}
        </div>
      )}

      {rows.length === 0 && (
        <p className="text-[15px] text-muted">
          {onlyFavourites
            ? 'No favourites yet.'
            : 'Nothing yet. This gets genuinely useful once there\u2019s history.'}
        </p>
      )}

      {rows.map((r) => (
        <Link
          key={r.bottle_id}
          href={`/session/${r.session_id}/learn`}
          className="rounded-lg border border-line bg-white px-4 py-3 active:bg-line"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium">
              {[r.producer, r.wine].filter(Boolean).join(' ') || 'Untitled'}
            </span>
            <span className="flex flex-shrink-0 items-center gap-1.5">
              {r.favourite && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-wine">
                  <polygon points="12 2.6 15 9 22 9.9 17 14.7 18.2 21.6 12 18.3 5.8 21.6 7 14.7 2 9.9 9 9" />
                </svg>
              )}
              {r.score != null && <span className="text-[15px] text-muted">{r.score}</span>}
            </span>
          </div>
          <div className="mt-0.5 text-[14px] text-muted">
            {[r.grape, r.region, r.vintage].filter(Boolean).join(' · ')}
          </div>
          {r.takeaway && <p className="mt-1.5 text-[15px] leading-relaxed">{r.takeaway}</p>}
          <div className="mt-1 text-[13px] text-muted">Session {r.session_number}</div>
        </Link>
      ))}
    </main>
  )
}
