import { NextResponse } from 'next/server'
import { checkPassphrase, issueCookie, clearCookie } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { passphrase, taster } = await req.json()

  if (typeof taster !== 'string' || !taster.trim()) {
    return NextResponse.json({ error: 'pick a name' }, { status: 400 })
  }
  if (typeof passphrase !== 'string' || !checkPassphrase(passphrase)) {
    return NextResponse.json({ error: 'wrong passphrase' }, { status: 401 })
  }

  await issueCookie(taster.trim())
  return NextResponse.json({ ok: true, taster: taster.trim() })
}

export async function DELETE() {
  await clearCookie()
  return NextResponse.json({ ok: true })
}
