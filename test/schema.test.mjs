import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'

/**
 * Runs db/schema.sql on a real Postgres (PGlite, WASM) and asserts the things
 * that TypeScript cannot: that one group's data is invisible to another, that
 * session numbering is per group, and that two people writing the same bottle
 * produce two rows.
 *
 *   npm run test:db
 *
 * No database or container needed — it runs in memory and throws away.
 */

const HOUSE = '00000000-0000-0000-0000-000000000001'
let failures = 0

function check(name, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    console.log(`  ok   ${name}`)
  } else {
    console.log(`  FAIL ${name}\n         expected ${e}\n         got      ${a}`)
    failures++
  }
}

const db = await PGlite.create()
const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8')
await db.exec(schema)
console.log('schema applied\n')

// Two households. Mike and Sarah taste together; Ana is a stranger.
const [mike, sarah, ana] = await Promise.all(
  ['Mike', 'Sarah', 'Ana'].map(async (n) => {
    const r = await db.query('insert into users (display_name) values ($1) returning id', [n])
    return r.rows[0].id
  }),
)
const other = (
  await db.query(
    "insert into groups (name, invite_code) values ('Ana''s lot', 'ana') returning id",
  )
).rows[0].id

await db.exec(`
  insert into memberships (group_id, user_id) values
    ('${HOUSE}', '${mike}'), ('${HOUSE}', '${sarah}'), ('${other}', '${ana}');
`)

// A flight of two in the house.
const session = (
  await db.query(
    'insert into sessions (group_id, number, focus) values ($1, 1, $2) returning id',
    [HOUSE, 'Stainless vs. oak'],
  )
).rows[0].id
const bottles = []
for (const [i, name] of ['Clos des Briords', 'Perbacco'].entries()) {
  const r = await db.query(
    'insert into bottles (session_id, position, wine) values ($1, $2, $3) returning id',
    [session, i + 1, name],
  )
  bottles.push(r.rows[0].id)
}

// --- isolation -------------------------------------------------------------

const cellar = async (userId, groupId) =>
  (
    await db.query(
      `select count(*)::int as n from bottles b
       join sessions s on s.id = b.session_id
       left join notes n on n.bottle_id = b.id and n.user_id = $1
       where s.group_id = $2`,
      [userId, groupId],
    )
  ).rows[0].n

check("Mike sees the house's two bottles", await cellar(mike, HOUSE), 2)
check('Ana sees none of them', await cellar(ana, other), 0)

// --- per-group session numbering -------------------------------------------

const nextNumber = async (groupId) =>
  (
    await db.query(
      'select coalesce(max(number), 0) + 1 as next from sessions where group_id = $1',
      [groupId],
    )
  ).rows[0].next

check("the house's next session is 2", await nextNumber(HOUSE), 2)
check("Ana's first session is 1, not 3", await nextNumber(other), 1)

// --- two people, one bottle, two rows ---------------------------------------

for (const u of [mike, sarah]) {
  await db.query(
    'insert into notes (bottle_id, user_id, acidity) values ($1, $2, $3)',
    [bottles[0], u, 'high'],
  )
}
check(
  'both notes on bottle one survive',
  (await db.query('select count(*)::int as n from notes where bottle_id = $1', [bottles[0]]))
    .rows[0].n,
  2,
)

let collided = false
try {
  await db.query('insert into notes (bottle_id, user_id) values ($1, $2)', [bottles[0], mike])
} catch {
  collided = true
}
check('a second note from the same person is rejected', collided, true)

// --- who still owes a note --------------------------------------------------

const pending = async (bottleId, groupId, userId) =>
  (
    await db.query(
      `select u.display_name from memberships m
       join users u on u.id = m.user_id
       where m.group_id = $2 and m.user_id <> $3
         and not exists (select 1 from notes n where n.bottle_id = $1 and n.user_id = m.user_id)
       order by u.display_name`,
      [bottleId, groupId, userId],
    )
  ).rows.map((r) => r.display_name)

check('bottle one: nobody outstanding', await pending(bottles[0], HOUSE, mike), [])
check('bottle two: Sarah outstanding', await pending(bottles[1], HOUSE, mike), ['Sarah'])

// The bug this replaced: the old query asked "has anyone else written?", which
// with three people went quiet as soon as the first of them did.
const tom = (await db.query("insert into users (display_name) values ('Tom') returning id"))
  .rows[0].id
await db.query('insert into memberships (group_id, user_id) values ($1, $2)', [HOUSE, tom])
await db.query('insert into notes (bottle_id, user_id) values ($1, $2)', [bottles[1], sarah])
check(
  'with three people, Tom is still named after Sarah writes',
  await pending(bottles[1], HOUSE, mike),
  ['Tom'],
)

// --- rate limiting ----------------------------------------------------------

const hit = async (userId, bucket) =>
  (
    await db.query(
      `insert into rate_limits (user_id, bucket, window_start, count)
       values ($1, $2, date_trunc('hour', now()), 1)
       on conflict (user_id, bucket, window_start)
         do update set count = rate_limits.count + 1
       returning count`,
      [userId, bucket],
    )
  ).rows[0].count

check('first call counts one', await hit(mike, 'ocr'), 1)
for (let i = 0; i < 40; i++) await hit(mike, 'ocr')
check('the 42nd call is over the limit of 40', (await hit(mike, 'ocr')) > 40, true)
check("Sarah's budget is untouched", await hit(sarah, 'ocr'), 1)

console.log(`\n${failures === 0 ? 'all checks passed' : failures + ' FAILED'}`)
process.exit(failures === 0 ? 0 : 1)
