import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { currentTaster } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const taster = await currentTaster()
  if (!taster) return NextResponse.json({ error: 'not signed in' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 })
  }

  const blob = await put(`labels/${crypto.randomUUID()}`, file, {
    access: 'public',
    contentType: file.type || 'image/jpeg',
  })

  return NextResponse.json({ url: blob.url })
}
