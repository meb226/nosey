import { neon } from '@neondatabase/serverless'
import { readFile, readdir } from 'node:fs/promises'
import { splitStatements } from './sql-split.mjs'

/**
 * Run one migration against DATABASE_URL:
 *
 *   npm run db:migrate -- 001
 *
 * Rehearse it on a Neon branch first. A migration that drops columns is the
 * one operation where "it passed the tests" is not the same as "it is safe on
 * my actual notes".
 */
const dir = new URL('../db/migrations/', import.meta.url)
const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()

const which = process.argv[2]
if (!which) {
  console.error('which migration? available:')
  for (const f of files) console.error(`  ${f}`)
  console.error('\n  npm run db:migrate -- 001')
  process.exit(1)
}

const file = files.find((f) => f.startsWith(which))
if (!file) {
  console.error(`no migration starting with "${which}". available: ${files.join(', ')}`)
  process.exit(1)
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const text = await readFile(new URL(file, dir), 'utf8')
const sql = neon(url)

// The file wraps itself in begin/commit; the driver sends one statement at a
// time, so those arrive as their own statements and do the right thing.
for (const statement of splitStatements(text)) {
  await sql.query(statement)
}

console.log(`applied ${file}`)
