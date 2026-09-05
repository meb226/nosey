import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'

/**
 * Builds a database on the two-person schema, fills it with the kind of data
 * you would actually have, then runs the migration and checks nothing was
 * lost. A broken migration on real notes is the worst outcome available here,
 * and it is the one thing a typecheck can say nothing about.
 *
 *   npm run test:migration
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

const db = await PGlite.create()
const here = (p) => new URL(p, import.meta.url)

await db.exec(await readFile(here('./fixtures/schema-v1.sql'), 'utf8'))
console.log('v1 schema applied (taster is a text column, sessions have no owner)\n')

// Two sessions of real-looking history.
for (const [n, focus] of [[1, 'Cool vs. warm'], [2, 'Stainless vs. oak']]) {
  const s = (
    await db.query('insert into sessions (number, focus) values ($1, $2) returning id', [n, focus])
  ).rows[0].id
  for (let i = 1; i <= 2; i++) {
    const b = (
      await db.query(
        'insert into bottles (session_id, position, wine) values ($1, $2, $3) returning id',
        [s, i, `Bottle ${n}.${i}`],
      )
    ).rows[0].id
    for (const taster of ['Mike', 'Sarah']) {
      await db.query(
        'insert into notes (bottle_id, taster, acidity, favourite) values ($1, $2, $3, $4)',
        [b, taster, 'high', taster === 'Mike' && i === 1],
      )
      await db.query('insert into explanations (bottle_id, taster, body) values ($1, $2, $3)', [
        b,
        taster,
        JSON.stringify({ what_youre_drinking: 'x' }),
      ])
    }
  }
  for (const taster of ['Mike', 'Sarah']) {
    await db.query('insert into flight_notes (session_id, taster, body) values ($1, $2, $3)', [
      s,
      taster,
      JSON.stringify({ what_it_isolated: 'y' }),
    ])
  }
}

const before = {
  notes: (await db.query('select count(*)::int as n from notes')).rows[0].n,
  explanations: (await db.query('select count(*)::int as n from explanations')).rows[0].n,
  flights: (await db.query('select count(*)::int as n from flight_notes')).rows[0].n,
  favourites: (await db.query('select count(*)::int as n from notes where favourite')).rows[0].n,
}
console.log(`before: ${before.notes} notes, ${before.explanations} explanations, ${before.flights} flight notes\n`)

await db.exec(await readFile(here('../db/migrations/001-groups-and-users.sql'), 'utf8'))
console.log('migration applied\n')

check('no notes lost', (await db.query('select count(*)::int as n from notes')).rows[0].n, before.notes)
check('no explanations lost', (await db.query('select count(*)::int as n from explanations')).rows[0].n, before.explanations)
check('no flight notes lost', (await db.query('select count(*)::int as n from flight_notes')).rows[0].n, before.flights)
check('favourites preserved', (await db.query('select count(*)::int as n from notes where favourite')).rows[0].n, before.favourites)

check(
  'one user per distinct taster name',
  (await db.query('select display_name from users order by display_name')).rows.map((r) => r.display_name),
  ['Mike', 'Sarah'],
)
check(
  'both joined the house',
  (await db.query('select count(*)::int as n from memberships')).rows[0].n,
  2,
)
check(
  'every session has an owner',
  (await db.query('select count(*)::int as n from sessions where group_id is null')).rows[0].n,
  0,
)
check(
  'every note is keyed on a user id',
  (await db.query('select count(*)::int as n from notes where user_id is null')).rows[0].n,
  0,
)

const cols = async (t) =>
  (
    await db.query('select column_name from information_schema.columns where table_name = $1', [t])
  ).rows.map((r) => r.column_name)
check('notes.taster is gone', (await cols('notes')).includes('taster'), false)
check('explanations.taster is gone', (await cols('explanations')).includes('taster'), false)
check('flight_notes.taster is gone', (await cols('flight_notes')).includes('taster'), false)

// Mike's notes should still be Mike's, not smeared across both people.
const mikes = (
  await db.query(
    `select count(*)::int as n from notes n join users u on u.id = n.user_id
     where u.display_name = 'Mike'`,
  )
).rows[0].n
check("Mike still owns exactly his four notes", mikes, 4)

// And the new unique key holds.
let collided = false
try {
  const row = (await db.query('select bottle_id, user_id from notes limit 1')).rows[0]
  await db.query('insert into notes (bottle_id, user_id) values ($1, $2)', [row.bottle_id, row.user_id])
} catch {
  collided = true
}
check('the new (bottle_id, user_id) key is enforced', collided, true)

// Re-running must be a no-op, not a second set of users.
await db.exec(await readFile(here('../db/migrations/001-groups-and-users.sql'), 'utf8'))
check(
  're-running the migration changes nothing',
  (await db.query('select count(*)::int as n from users')).rows[0].n,
  2,
)

console.log(`\n${failures === 0 ? 'all checks passed' : failures + ' FAILED'}`)
process.exit(failures === 0 ? 0 : 1)
