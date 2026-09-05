import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { currentUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Label photos are capped so one bad upload cannot fill the blob store. */
const MAX_BYTES = 12 * 1024 * 1024

export async function POST(req: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'not signed in' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'that is not an image' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'that photo is too large' }, { status: 413 })
  }

  // Public, but under an unguessable path. Worth knowing rather than assuming:
  // anyone holding the URL can open the photo, so it is obscurity and not
  // access control — fine for a label, not for anything else.
  const blob = await put(`labels/${crypto.randomUUID()}`, file, {
    access: 'public',
    contentType: file.type || 'image/jpeg',
  })

  return NextResponse.json({ url: blob.url })
}
