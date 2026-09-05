import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/auth'
import { nextSessionNumber } from '@/lib/queries'
import { NewSessionForm } from '@/components/NewSessionForm'

export const dynamic = 'force-dynamic'

export default async function NewSession() {
  const user = await currentUser()
  if (!user) redirect('/')

  return <NewSessionForm nextNumber={await nextSessionNumber(user.groupId)} />
}
