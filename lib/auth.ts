import { cookies } from 'next/headers'
import type { Taster } from './types'

const COOKIE = 'wino_taster'

/**
 * One year. The acceptance criterion is that neither of us re-authenticates
 * mid-session; a tasting runs ~20 minutes but sessions are weeks apart, and
 * an installed iOS PWA has its own storage partition separate from Safari,
 * so each device signs in exactly once.
 */
const MAX_AGE = 60 * 60 * 24 * 365

/**
 * TextEncoder returns Uint8Array<ArrayBufferLike>, which under strict TS does
 * not satisfy WebCrypto's BufferSource (it could in principle be backed by a
 * SharedArrayBuffer). It never is here.
 */
function bytes(s: string): BufferSource {
  return new TextEncoder().encode(s) as BufferSource
}

function secret(): BufferSource {
  const s = process.env.WINO_COOKIE_SECRET
  if (!s) throw new Error('WINO_COOKIE_SECRET is not set. See .env.local.example.')
  return bytes(s)
}

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    secret(),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, bytes(value))
  return Buffer.from(mac).toString('base64url')
}

/** Constant-time compare, so a bad cookie can't be brute-forced byte by byte. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function checkPassphrase(input: string): boolean {
  const expected = process.env.WINO_PASSPHRASE
  if (!expected) throw new Error('WINO_PASSPHRASE is not set. See .env.local.example.')
  return safeEqual(input, expected)
}

export async function issueCookie(taster: Taster): Promise<void> {
  const mac = await sign(taster)
  ;(await cookies()).set(COOKIE, `${taster}.${mac}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
}

/** The current taster, or null if unsigned / tampered with. */
export async function currentTaster(): Promise<Taster | null> {
  const raw = (await cookies()).get(COOKIE)?.value
  if (!raw) return null

  const dot = raw.lastIndexOf('.')
  if (dot < 1) return null

  const taster = raw.slice(0, dot)
  const mac = raw.slice(dot + 1)
  return safeEqual(await sign(taster), mac) ? taster : null
}

export async function clearCookie(): Promise<void> {
  ;(await cookies()).delete(COOKIE)
}
