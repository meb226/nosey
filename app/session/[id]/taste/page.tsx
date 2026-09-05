import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/auth'
import { getBottles, getMyNotes, getSession } from '@/lib/queries'
import { TasteForm } from '@/components/TasteForm'

export const dynamic = 'force-dynamic'

export default async function Taste({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await currentUser()
  if (!user) redirect('/')

  // getSession is scoped, so a session belonging to another group reads as
  // missing rather than forbidden — there is nothing to learn from the 404.
  const session = await getSession(id, user.groupId)
  if (!session) redirect('/')

  const bottles = await getBottles(id)
  const mine = await getMyNotes(id, user.id)

  // Resume where this taster left off. Pull-to-refresh fires in standalone
  // mode and will reload mid-session; per-bottle writes plus this make that
  // a non-event rather than a lost tasting.
  const startAt = bottles.findIndex((b) => !mine.has(b.id))
  if (startAt === -1) redirect(`/session/${id}/learn`)

  return <TasteForm bottles={bottles} sessionId={id} startAt={startAt} />
}
