import Link from 'next/link'
import { currentUser } from '@/lib/auth'
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
  owed: number
}

export default async function Home() {
  const user = await currentUser()
  if (!user) return <SignIn />

  // Everything counted here is this group's. Before scoping existed these were
  // three unqualified counts over the whole database.
  const [counts] = (await sql`
    select
      (select count(*)::int
         from bottles b join sessions s on s.id = b.session_id
        where s.group_id = ${user.groupId}) as bottles,
      (select count(*)::int
         from notes n
         join bottles b on b.id = n.bottle_id
         join sessions s on s.id = b.session_id
        where s.group_id = ${user.groupId} and n.user_id = ${user.id} and n.favourite) as favourites,
      (select count(*)::int from sessions where group_id = ${user.groupId}) as sessions
  `) as { bottles: number; favourites: number; sessions: number }[]

  const recent = (await sql`
    select s.id, s.number, s.focus, s.module,
           count(distinct b.id)::int as bottles,
           count(distinct b.id) filter (where n.user_id = ${user.id})::int as mine,
           -- How many notes the rest of the group still owe across this
           -- session. Counting people-times-bottles rather than "has anyone
           -- else written", which went quiet as soon as the first of them did.
           (
             select count(*)::int
             from memberships m
             cross join bottles b2
             where m.group_id = ${user.groupId}
               and m.user_id <> ${user.id}
               and b2.session_id = s.id
               and not exists (
                 select 1 from notes n2 where n2.bottle_id = b2.id and n2.user_id = m.user_id
               )
           ) as owed
    from sessions s
    left join bottles b on b.session_id = s.id
    left join notes n on n.bottle_id = b.id
    where s.group_id = ${user.groupId}
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
            Evening, {user.displayName}. Write it down first.
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
 * Surfaces the hold-off rule outside the learn screen. Your own outstanding
 * notes come first, because that is the thing only you can fix.
 */
function sessionLine(s: Recent): string {
  const base = `Session ${s.number}`
  if (s.bottles === 0) return base
  if (s.mine < s.bottles) return `${base} · ${s.bottles - s.mine} left to write`
  if (s.owed > 0) return `${base} · still waiting on the others`
  return `${base} · everyone has written`
}
