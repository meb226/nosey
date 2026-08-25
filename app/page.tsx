import Link from 'next/link'
import { currentTaster } from '@/lib/auth'
import { sql } from '@/lib/db'
import { SignIn } from '@/components/SignIn'
import { AXES } from '@/lib/axes'

export const dynamic = 'force-dynamic'

type Recent = {
  id: string
  number: number
  focus: string | null
  module: string | null
  bottles: number
  mine: number
  theirs: number
}

export default async function Home() {
  const taster = await currentTaster()
  if (!taster) return <SignIn />

  const [counts] = (await sql`
    select
      (select count(*)::int from bottles) as bottles,
      (select count(*)::int from notes where taster = ${taster} and favourite) as favourites,
      (select count(*)::int from sessions) as sessions
  `) as { bottles: number; favourites: number; sessions: number }[]

  const recent = (await sql`
    select s.id, s.number, s.focus, s.module,
           count(b.id)::int as bottles,
           count(*) filter (where n.taster = ${taster})::int as mine,
           count(*) filter (where n.taster is not null and n.taster <> ${taster})::int as theirs
    from sessions s
    left join bottles b on b.session_id = s.id
    left join notes n on n.bottle_id = b.id
    group by s.id
    order by s.created_at desc
    limit 3
  `) as Recent[]

  const stats = [
    { n: counts.bottles, label: counts.bottles === 1 ? 'bottle' : 'bottles' },
    { n: counts.favourites, label: 'favourites' },
    { n: counts.sessions, label: counts.sessions === 1 ? 'session' : 'sessions' },
  ]

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col bg-gradient-to-b from-groundtop to-ground to-[46%]">
      <div className="flex flex-col gap-5 px-5 pb-6 pt-11">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[46px] font-extrabold leading-[0.95] tracking-[-0.04em] text-headline">
            Nosey
          </h1>
          <p className="text-[16px] font-semibold text-sub text-pretty">
            Evening, {taster}. Write it down first.
          </p>
        </div>

        {/* The counts lead, because this accumulation is the only reward here. */}
        <div className="flex gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-1 flex-col gap-px rounded-xl border-2 border-ink bg-white px-3 py-2.5"
            >
              <span className="text-[24px] font-extrabold leading-tight tracking-[-0.03em]">
                {s.n}
              </span>
              <span className="text-[12px] font-semibold text-muted">{s.label}</span>
            </div>
          ))}
        </div>

        <Link href="/session/new" className="btn flex items-center justify-center">
          Start a session
        </Link>

        {recent.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-sub">
              Pick up where you left off
            </span>
            {recent.map((s, i) => (
              <Link
                key={s.id}
                href={`/session/${s.id}/learn`}
                className="folder flex items-center gap-2.5 bg-folder px-3.5 py-3.5 text-white active:bg-folderopen"
              >
                <span
                  className="chip"
                  style={{ background: AXES[i % AXES.length].chip }}
                  aria-hidden
                />
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-[16px] font-bold tracking-[-0.012em]">
                    {s.focus || s.module || `Session ${s.number}`}
                  </span>
                  <span className="text-[13px] font-medium text-onfoldermuted">
                    {sessionLine(s)}
                  </span>
                </span>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <polyline points="9 6 15 12 9 18" />
                </svg>
              </Link>
            ))}
          </div>
        )}

        <Link href="/cellar" className="btn-quiet flex items-center justify-center">
          My cellar
        </Link>
      </div>
      <div className="flex-1" />
    </main>
  )
}

/**
 * Surfaces the hold-off rule outside the learn screen: if they have written
 * and you have not, that is the one thing worth knowing before you tap in.
 */
function sessionLine(s: Recent): string {
  const base = `Session ${s.number}`
  if (s.bottles === 0) return base
  if (s.mine < s.bottles) return `${base} · ${s.bottles - s.mine} left to write`
  if (s.theirs < s.bottles) return `${base} · they haven't written theirs`
  return `${base} · both written`
}
