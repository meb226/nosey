import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentTaster } from '@/lib/auth'
import { getBottles, getMyNotes, getSession, othersPending } from '@/lib/queries'
import { Explanation } from '@/components/Explanation'
import { FlightNote } from '@/components/FlightNote'

export const dynamic = 'force-dynamic'

export default async function Learn({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const taster = await currentTaster()
  if (!taster) redirect('/')

  const session = await getSession(id)
  if (!session) redirect('/')

  const bottles = await getBottles(id)
  const mine = await getMyNotes(id, taster)
  const pending = await Promise.all(bottles.map((b) => othersPending(b.id, taster)))

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-8 px-6 py-10">
      <header>
        <div className="text-[13px] uppercase tracking-wide text-muted">
          Session {session.number}
          {session.module ? ` · ${session.module}` : ''}
        </div>
        {session.focus && <h1 className="mt-1 text-2xl font-semibold">{session.focus}</h1>}
      </header>

      {bottles.map((b, i) => (
        <section key={b.id} className="flex flex-col gap-4 border-t border-line pt-6">
          {/* Opens on the label photo. */}
          {b.label_photo_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={b.label_photo_url} alt="" className="h-48 w-full rounded-lg object-cover" />
          )}

          <div>
            <div className="text-[13px] uppercase tracking-wide text-muted">Bottle {i + 1}</div>
            <h2 className="text-xl font-semibold">
              {[b.producer, b.wine, b.vintage].filter(Boolean).join(' ')}
            </h2>
          </div>

          {mine.has(b.id) ? (
            <>
              <Explanation bottleId={b.id} />
              {/*
                Etiquette, not architecture. There is no gate and no 403 —
                this line is the entire enforcement mechanism.
              */}
              {pending[i] && (
                <p className="rounded-lg bg-line/50 px-3 py-2.5 text-[14px] leading-relaxed text-muted">
                  She hasn&rsquo;t written this one yet. Hold off talking about it.
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[15px] leading-relaxed text-muted">
                Write your note first. Reading this before you taste turns the whole thing into
                memorization.
              </p>
              <Link href={`/session/${id}/taste`} className="btn text-center">
                Write it
              </Link>
            </div>
          )}
        </section>
      ))}

      {bottles.length > 1 && (
        <section className="flex flex-col gap-4 border-t border-line pt-6">
          <h2 className="text-xl font-semibold">The flight</h2>
          <FlightNote sessionId={id} />
        </section>
      )}

      <Link href="/cellar" className="text-center text-[15px] text-muted underline">
        My cellar
      </Link>
    </main>
  )
}
