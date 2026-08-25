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
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col bg-gradient-to-b from-groundtop to-ground to-[46%]">
      <div className="flex flex-col gap-6 px-5 pb-6 pt-8">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-sub">
            Session {session.number}
            {session.module ? ` · ${session.module}` : ''}
          </span>
          {session.focus && (
            <h1 className="text-[30px] font-extrabold leading-[1.04] tracking-[-0.026em] text-headline text-pretty">
              {session.focus}
            </h1>
          )}
        </div>

        {bottles.map((b, i) => (
          <section key={b.id} className="flex flex-col gap-3.5">
            {/* Opens on the label photo. */}
            {b.label_photo_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={b.label_photo_url}
                alt=""
                className="h-48 w-full rounded-xl border-2 border-ink object-cover"
              />
            )}

            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-sub">
                Bottle {i + 1}
              </span>
              <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-headline text-pretty">
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
                  <p className="rounded-xl border-2 border-ink bg-amber px-3.5 py-3 text-[15px] font-semibold leading-snug text-ink text-pretty">
                    She hasn&rsquo;t written this one yet. Hold off talking about it.
                  </p>
                )}
              </>
            ) : (
              <div className="folder">
                <div className="folder-body gap-3.5">
                  <p className="text-[16px] leading-relaxed text-ink text-pretty">
                    Write your note first. Reading this before you taste turns the whole thing
                    into memorisation.
                  </p>
                  <Link
                    href={`/session/${id}/taste`}
                    className="btn flex items-center justify-center"
                  >
                    Write it
                  </Link>
                </div>
              </div>
            )}
          </section>
        ))}

        {bottles.length > 1 && (
          <section className="flex flex-col gap-3.5">
            <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-headline">
              The flight
            </h2>
            <FlightNote sessionId={id} />
          </section>
        )}

        <div className="flex flex-col gap-2.5">
          <Link href="/cellar" className="btn-quiet flex items-center justify-center">
            My cellar
          </Link>
          <Link href="/" className="btn-quiet flex items-center justify-center">
            Home
          </Link>
        </div>
      </div>
      <div className="flex-1" />
    </main>
  )
}
