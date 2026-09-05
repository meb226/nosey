import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { splitStatements } from '../scripts/sql-split.mjs'

/**
 * db:push and db:migrate send one statement at a time, so the splitter is the
 * only thing standing between a schema file and a database. It shipped once
 * splitting naively on ';' and broke on a semicolon inside a comment — which
 * meant `npm run db:push` would have failed on the schema's own header.
 *
 *   npm run test:sql
 */

let failures = 0
function check(name, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) console.log(`  ok   ${name}`)
  else {
    console.log(`  FAIL ${name}\n         expected ${e}\n         got      ${a}`)
    failures++
  }
}

// --- the cases that broke it, and the ones that would next ------------------

check(
  'a semicolon inside a line comment does not split',
  splitStatements("-- install; run this\nselect 1;").length,
  1,
)
check(
  'a semicolon inside a string literal does not split',
  splitStatements("select 'a;b';").length,
  1,
)
check(
  'an escaped quote does not end the literal early',
  splitStatements("select 'it''s; fine';").length,
  1,
)
check(
  'a dollar-quoted block does not split',
  splitStatements('do $$ begin perform 1; perform 2; end $$;').length,
  1,
)
check(
  'a block comment does not split',
  splitStatements('/* one; two */ select 1;').length,
  1,
)
check('comment-only input yields nothing', splitStatements('-- nothing here\n').length, 0)
check('two real statements still split', splitStatements('select 1; select 2;').length, 2)

// --- the real files, applied the way the scripts apply them -----------------

const here = (p) => new URL(p, import.meta.url)

const schema = await readFile(here('../db/schema.sql'), 'utf8')
const schemaStatements = splitStatements(schema)
{
  const db = await PGlite.create()
  let err = null
  for (const s of schemaStatements) {
    try {
      await db.query(s)
    } catch (e) {
      err = e.message
      break
    }
  }
  check(`db:push applies schema.sql (${schemaStatements.length} statements)`, err, null)
}

// And the migration, over a v1 database, exactly as db:migrate would send it.
{
  const db = await PGlite.create()
  await db.exec(await readFile(here('./fixtures/schema-v1.sql'), 'utf8'))
  const migration = await readFile(here('../db/migrations/001-groups-and-users.sql'), 'utf8')
  const statements = splitStatements(migration)
  let err = null
  for (const s of statements) {
    try {
      await db.query(s)
    } catch (e) {
      err = e.message
      break
    }
  }
  check(`db:migrate applies 001 (${statements.length} statements)`, err, null)
}

console.log(`\n${failures === 0 ? 'all checks passed' : failures + ' FAILED'}`)
process.exit(failures === 0 ? 0 : 1)
