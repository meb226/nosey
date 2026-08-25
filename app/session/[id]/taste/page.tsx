import { redirect } from 'next/navigation'
import { currentTaster } from '@/lib/auth'
import { getBottles, getMyNotes, getSession } from '@/lib/queries'
import { TasteForm } from '@/components/TasteForm'

export const dynamic = 'force-dynamic'

export default async function Taste({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const taster = await currentTaster()
  if (!taster) redirect('/')

  const session = await getSession(id)
  if (!session) redirect('/')

  const bottles = await getBottles(id)
  const mine = await getMyNotes(id, taster)

  // Resume where this taster left off. Pull-to-refresh fires in standalone
  // mode and will reload mid-session; per-bottle writes plus this make that
  // a non-event rather than a lost tasting.
  const startAt = bottles.findIndex((b) => !mine.has(b.id))
  if (startAt === -1) redirect(`/session/${id}/learn`)

  return <TasteForm bottles={bottles} sessionId={id} startAt={startAt} />
}
