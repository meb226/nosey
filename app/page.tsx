import Link from 'next/link'
import { currentTaster } from '@/lib/auth'
import { sql } from '@/lib/db'
import { SignIn } from '@/components/SignIn'
import type { Session } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const taster = await currentTaster()
  if (!taster) return <SignIn />

  const recent = (await sql`
    select * from sessions order by created_at desc limit 3
  `) as Session[]

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-3xl font-semibold">Wino</h1>
        <p className="mt-1 text-[15px] text-muted">Evening, {taster}.</p>
      </div>

      <Link href="/session/new" className="btn text-center">
        New session
      </Link>

      {recent.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[13px] uppercase tracking-wide text-muted">Recent</h2>
          {recent.map((s) => (
            <Link
              key={s.id}
              href={`/session/${s.id}/learn`}
              className="rounded-lg border border-line bg-white px-4 py-3 active:bg-line"
            >
              <div className="font-medium">
                Session {s.number}
                {s.module ? ` · ${s.module}` : ''}
              </div>
              {s.focus && <div className="mt-0.5 text-[14px] text-muted">{s.focus}</div>}
            </Link>
          ))}
        </section>
      )}

      <Link href="/log" className="text-center text-[15px] text-muted underline">
        Everything you&rsquo;ve tasted
      </Link>
    </main>
  )
}
