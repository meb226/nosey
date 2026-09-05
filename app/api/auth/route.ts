import { NextResponse } from 'next/server'
import { checkPassphrase, signIn, clearCookie } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { passphrase, taster } = await req.json()

  if (typeof taster !== 'string' || !taster.trim()) {
    return NextResponse.json({ error: 'pick a name' }, { status: 400 })
  }
  if (taster.trim().length > 40) {
    return NextResponse.json({ error: 'that name is too long' }, { status: 400 })
  }
  if (typeof passphrase !== 'string' || !checkPassphrase(passphrase)) {
    return NextResponse.json({ error: 'wrong passphrase' }, { status: 401 })
  }

  const user = await signIn(taster)
  return NextResponse.json({ ok: true, taster: user.displayName })
}

export async function DELETE() {
  await clearCookie()
  return NextResponse.json({ ok: true })
}
