import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { sql } from './db'
import type { SessionUser } from './types'

const COOKIE = 'nosey_user'

/** The group everyone lands in until invite codes exist. */
export const DEFAULT_GROUP_ID = '00000000-0000-0000-0000-000000000001'

/**
 * One year. Nobody should re-authenticate mid-session; tastings are weeks
 * apart, and an installed iOS PWA has its own storage partition separate from
 * Safari, so each device signs in exactly once.
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
  const s = process.env.NOSEY_COOKIE_SECRET
  if (!s) throw new Error('NOSEY_COOKIE_SECRET is not set. See .env.local.example.')
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

/** Constant-time compare, so a bad cookie cannot be brute-forced byte by byte. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function checkPassphrase(input: string): boolean {
  const expected = process.env.NOSEY_PASSPHRASE
  if (!expected) throw new Error('NOSEY_PASSPHRASE is not set. See .env.local.example.')
  return safeEqual(input, expected)
}

/**
 * Find or create the person behind a display name, and put them in a group.
 *
 * Known limitation, and the reason this is a seam rather than a solution:
 * anyone holding the shared passphrase can claim any name and land on that
 * person's row. That was already true before groups existed — what changed is
 * that identity is now a stable id, so wiring in a real auth provider means
 * setting `external_id` and reading it here, with no second data migration.
 */
export async function signIn(displayName: string): Promise<SessionUser> {
  const name = displayName.trim()

  const found = (await sql`
    select id from users where lower(display_name) = lower(${name}) limit 1
  `) as { id: string }[]

  const id =
    found[0]?.id ??
    (
      (await sql`
        insert into users (display_name) values (${name}) returning id
      `) as { id: string }[]
    )[0].id

  await sql`
    insert into memberships (group_id, user_id)
    values (${DEFAULT_GROUP_ID}, ${id})
    on conflict do nothing
  `

  const cookieStore = await cookies()
  cookieStore.set(COOKIE, `${id}.${await sign(id)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })

  const user = await currentUserUncached(id)
  if (!user) throw new Error('signed in but could not read the user back')
  return user
}

async function currentUserUncached(id: string): Promise<SessionUser | null> {
  const rows = (await sql`
    select u.id, u.display_name, g.id as group_id, g.name as group_name
    from users u
    join memberships m on m.user_id = u.id
    join groups g on g.id = m.group_id
    where u.id = ${id}
    order by m.joined_at
    limit 1
  `) as { id: string; display_name: string; group_id: string; group_name: string }[]

  const r = rows[0]
  return r
    ? { id: r.id, displayName: r.display_name, groupId: r.group_id, groupName: r.group_name }
    : null
}

/**
 * The signed-in person, or null. Wrapped in React's cache so the several
 * server components that need it in one render share a single query.
 */
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const raw = (await cookies()).get(COOKIE)?.value
  if (!raw) return null

  const dot = raw.lastIndexOf('.')
  if (dot < 1) return null

  const id = raw.slice(0, dot)
  const mac = raw.slice(dot + 1)
  if (!safeEqual(await sign(id), mac)) return null

  return currentUserUncached(id)
})

export async function clearCookie(): Promise<void> {
  ;(await cookies()).delete(COOKIE)
}
