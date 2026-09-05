import 'server-only'
import { sql } from './db'

/**
 * Postgres-backed rather than in-memory: serverless functions do not share
 * memory, so an in-process counter would reset on every cold start and protect
 * nothing. Fixed hourly windows — crude, but the goal is stopping a runaway
 * loop or a bored guest from spending the API budget, not fair queueing.
 *
 * OCR is the tightest because it always costs: every call is a vision request
 * plus a blob write, and nothing about it is cached. Explanations and flight
 * notes are cached per person per bottle, so repeats are free.
 */
export const LIMITS = {
  ocr: 40,
  explain: 60,
  flight: 30,
} as const

export type Bucket = keyof typeof LIMITS

export type RateVerdict = { ok: true } | { ok: false; limit: number; retryAfter: number }

export async function checkRate(userId: string, bucket: Bucket): Promise<RateVerdict> {
  const limit = LIMITS[bucket]

  const rows = (await sql`
    insert into rate_limits (user_id, bucket, window_start, count)
    values (${userId}, ${bucket}, date_trunc('hour', now()), 1)
    on conflict (user_id, bucket, window_start)
      do update set count = rate_limits.count + 1
    returning count
  `) as { count: number }[]

  // Old windows are never read again. Tidied opportunistically rather than on
  // every request, since this is housekeeping and not worth the write.
  if (Math.random() < 0.02) {
    await sql`delete from rate_limits where window_start < now() - interval '2 days'`
  }

  if (rows[0].count > limit) {
    const retryAfter = 3600 - (Math.floor(Date.now() / 1000) % 3600)
    return { ok: false, limit, retryAfter }
  }
  return { ok: true }
}
