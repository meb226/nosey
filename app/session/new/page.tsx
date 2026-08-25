import { redirect } from 'next/navigation'
import { currentTaster } from '@/lib/auth'
import { sql } from '@/lib/db'
import { NewSessionForm } from '@/components/NewSessionForm'

export const dynamic = 'force-dynamic'

export default async function NewSession() {
  if (!(await currentTaster())) redirect('/')

  const rows = (await sql`select coalesce(max(number), 0) + 1 as next from sessions`) as {
    next: number
  }[]

  return <NewSessionForm nextNumber={rows[0].next} />
}
