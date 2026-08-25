import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentTaster } from '@/lib/auth'
import { sql } from '@/lib/db'
import { AXES } from '@/lib/axes'
import palette from '@/palette.json'

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
}

function Star({ className }: { className?: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <polygon points="12 2.6 15 9 22 9.9 17 14.7 18.2 21.6 12 18.3 5.8 21.6 7 14.7 2 9.9 9 9" />
    </svg>
  )
}

/** Stable colour per grape, so the shelf is scannable before you read a word. */
function hueFor(grape: string | null): string {
  if (!grape) return palette.empty
  let h = 0
  for (let i = 0; i < grape.length; i++) h = (h * 31 + grape.charCodeAt(i)) >>> 0
  const wheel = AXES.filter((a) => a.kind === 'level').map((a) => a.chip)
  return wheel[h % wheel.length]
}

export default async function Cellar({
  searchParams,
}: {
  searchParams: Promise<{ grape?: string; fav?: string; q?: string }>
}) {
  const taster = await currentTaster()
  if (!taster) redirect('/')

  const { grape, fav, q } = await searchParams
  const onlyFavourites = fav === '1'
  const query = q?.trim() || null

  const rows = (await sql`
    select b.id as bottle_id, b.session_id, s.number as session_number,
           b.producer, b.wine, b.grape, b.region, b.country, b.vintage,
           n.score, coalesce(n.favourite, false) as favourite, n.takeaway
    from bottles b
    join sessions s on s.id = b.session_id
    left join notes n on n.bottle_id = b.id and n.taster = ${taster}
    where (${grape ?? null}::text is null or b.grape = ${grape ?? null})
      and (${onlyFavourites} = false or n.favourite = true)
      and (${query}::text is null or (
        coalesce(b.producer, '') || ' ' || coalesce(b.wine, '') || ' ' ||
        coalesce(b.grape, '') || ' ' || coalesce(b.region, '') || ' ' ||
        coalesce(b.country, '') || ' ' || coalesce(n.takeaway, '')
      ) ilike '%' || ${query} || '%')
    order by s.created_at desc, b.position
  `) as Row[]

  const [totals] = (await sql`
    select count(*)::int as bottles,
           count(*) filter (where n.favourite)::int as favourites
    from bottles b
    left join notes n on n.bottle_id = b.id and n.taster = ${taster}
  `) as { bottles: number; favourites: number }[]

  const grapes = [...new Set(rows.map((r) => r.grape).filter(Boolean))] as string[]
  const filtered = onlyFavourites || query || grape

  const chip = (active: boolean) =>
    `flex min-h-[38px] items-center gap-1.5 rounded-full border-2 px-3.5 text-[15px] ${
      active ? 'border-ink bg-amber font-bold' : 'border-hairline bg-white font-medium'
    } text-ink`

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col bg-gradient-to-b from-groundtop to-ground to-[46%]">
      <div className="flex flex-col gap-4 px-5 pb-6 pt-8">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[32px] font-extrabold leading-[1.02] tracking-[-0.028em] text-headline">
            My cellar
          </h1>
          <span className="text-[15px] font-semibold text-sub">
            {filtered
              ? `${rows.length} of ${totals.bottles} bottles`
              : `${totals.bottles} bottles · ${totals.favourites} favourites`}
          </span>
        </div>

        <form action="/cellar" className="relative flex items-center">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="absolute left-3.5 text-muted"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" />
          </svg>
          <input
            name="q"
            defaultValue={query ?? ''}
            placeholder="Grape, region, a word you wrote"
            className="field min-h-[50px] border-ink pl-10"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          <Link href="/cellar" className={chip(!filtered)}>
            All
          </Link>
          <Link href={onlyFavourites ? '/cellar' : '/cellar?fav=1'} className={chip(onlyFavourites)}>
            <Star />
            Favourites
          </Link>
          {grapes.slice(0, 4).map((g) => (
            <Link
              key={g}
              href={`/cellar?grape=${encodeURIComponent(g)}`}
              className={chip(grape === g)}
            >
              {g}
            </Link>
          ))}
        </div>

        {rows.length === 0 && (
          <p className="text-[15px] font-semibold text-sub text-pretty">
            {filtered
              ? 'Nothing matches that.'
              : 'Nothing yet. This gets genuinely useful once there is some history.'}
          </p>
        )}

        <div className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <Link key={r.bottle_id} href={`/session/${r.session_id}/learn`} className="folder flex">
              <span
                className="w-3 flex-shrink-0 border-r-2 border-white"
                style={{ background: hueFor(r.grape) }}
                aria-hidden
              />
              <span className="flex min-w-0 flex-1 flex-col gap-1 bg-folder px-3.5 py-3.5 text-white">
                <span className="flex items-start justify-between gap-2.5">
                  <span className="text-[17px] font-bold leading-tight tracking-[-0.014em] text-pretty">
                    {[r.producer, r.wine].filter(Boolean).join(' ') || 'Untitled'}
                  </span>
                  <span className="flex flex-shrink-0 items-center gap-2">
                    {r.favourite && <Star className="text-amber" />}
                    {r.score != null && (
                      <span className="inline-flex h-[27px] min-w-[33px] items-center justify-center rounded-[7px] border-2 border-white bg-white px-1.5 text-[14px] font-bold text-ink">
                        {r.score}
                      </span>
                    )}
                  </span>
                </span>
                <span className="text-[13px] font-medium text-onfoldermuted">
                  {[r.grape, r.region, r.vintage].filter(Boolean).join(' · ')}
                </span>
                {r.takeaway && (
                  <span className="text-[15px] leading-snug text-pretty">{r.takeaway}</span>
                )}
              </span>
            </Link>
          ))}
        </div>

        <Link href="/" className="btn-quiet flex items-center justify-center">
          Home
        </Link>
      </div>
      <div className="flex-1" />
    </main>
  )
}
