import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let cached: NeonQueryFunction<false, false> | null = null

/**
 * Resolved on first query, not at import. `next build` loads every route
 * module to read its config exports, and throwing at import time would make
 * the build depend on a database URL it has no reason to need.
 */
function client(): NeonQueryFunction<false, false> {
  if (!cached) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set. See .env.local.example.')
    cached = neon(url)
  }
  return cached
}

export const sql = ((strings: TemplateStringsArray, ...values: unknown[]) =>
  client()(strings, ...values)) as NeonQueryFunction<false, false>
