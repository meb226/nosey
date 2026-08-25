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
  takeaway: string | null
  created_at: string
}

export default async function Log({
  searchParams,
}: {
  searchParams: Promise<{ grape?: string; country?: string }>
}) {
  const taster = await currentTaster()
  if (!taster) redirect('/')

  const { grape, country } = await searchParams

  const rows = (await sql`
    select b.id as bottle_id, b.session_id, s.number as session_number,
           b.producer, b.wine, b.grape, b.region, b.country, b.vintage,
           n.score, n.takeaway, s.created_at
    from bottles b
    join sessions s on s.id = b.session_id
    left join notes n on n.bottle_id = b.id and n.taster = ${taster}
    where (${grape ?? null}::text is null or b.grape = ${grape ?? null})
      and (${country ?? null}::text is null or b.country = ${country ?? null})
    order by s.created_at desc, b.position
  `) as Row[]

  const grapes = [...new Set(rows.map((r) => r.grape).filter(Boolean))] as string[]

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-5 px-6 py-10">
      <h1 className="text-2xl font-semibold">The log</h1>

      {grapes.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <Link
            href="/log"
            className={`rounded-full border px-3 py-1.5 text-[15px] ${!grape ? 'border-wine bg-wine text-white' : 'border-line bg-white'}`}
          >
            All
          </Link>
          {grapes.map((g) => (
            <Link
              key={g}
              href={`/log?grape=${encodeURIComponent(g)}`}
              className={`rounded-full border px-3 py-1.5 text-[15px] ${grape === g ? 'border-wine bg-wine text-white' : 'border-line bg-white'}`}
            >
              {g}
            </Link>
          ))}
        </div>
      )}

      {rows.length === 0 && (
        <p className="text-[15px] text-muted">
          Nothing yet. This gets genuinely useful once there&rsquo;s history.
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
            {r.score != null && <span className="text-[15px] text-muted">{r.score}</span>}
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
