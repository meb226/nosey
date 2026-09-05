import { list, del } from '@vercel/blob'
import { neon } from '@neondatabase/serverless'

/**
 * Delete label photos that no bottle row points at.
 *
 * These accumulate on their own. The upload fires the moment you photograph a
 * label, but the session is not created until you press Start tasting — so
 * every abandoned form leaves its photos behind with nothing referencing them.
 * Deleting a session would do the same: the bottle rows cascade, the blobs do
 * not.
 *
 *   npm run blob:sweep              # list what would go, delete nothing
 *   npm run blob:sweep -- --delete  # actually delete
 *
 * Dry run is the default because this removes files and a bug here is not
 * recoverable.
 */

const DELETE = process.argv.includes('--delete')

/**
 * Photos younger than this are left alone whatever the database says. Without
 * it, a sweep running while someone has the new-session form open would delete
 * the label they just photographed and are still typing under.
 */
const MIN_AGE_HOURS = Number(
  process.argv.find((a) => a.startsWith('--min-age='))?.split('=')[1] ?? 24,
)

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set. Run: vercel env pull .env.local')
  process.exit(1)
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is not set. Run: vercel env pull .env.local')
  process.exit(1)
}

const sql = neon(url)

const referenced = new Set(
  (await sql`select label_photo_url from bottles where label_photo_url is not null`).map(
    (r) => r.label_photo_url,
  ),
)
console.log(`${referenced.size} photos referenced by a bottle`)

const cutoff = Date.now() - MIN_AGE_HOURS * 3600 * 1000
const orphans = []
let scanned = 0
let tooYoung = 0
let cursor

do {
  const page = await list({ prefix: 'labels/', cursor, limit: 1000 })
  for (const blob of page.blobs) {
    scanned++
    if (referenced.has(blob.url)) continue
    if (new Date(blob.uploadedAt).getTime() > cutoff) {
      tooYoung++
      continue
    }
    orphans.push(blob)
  }
  cursor = page.hasMore ? page.cursor : undefined
} while (cursor)

const mb = (n) => (n / 1024 / 1024).toFixed(1)
const freed = orphans.reduce((n, b) => n + b.size, 0)

console.log(`${scanned} photos in the store`)
if (tooYoung) console.log(`${tooYoung} skipped as younger than ${MIN_AGE_HOURS}h`)

if (orphans.length === 0) {
  console.log('no orphans')
  process.exit(0)
}

console.log(`\n${orphans.length} orphaned, ${mb(freed)} MB:`)
for (const b of orphans.slice(0, 20)) {
  console.log(`  ${b.pathname}  ${mb(b.size)} MB  ${new Date(b.uploadedAt).toISOString().slice(0, 10)}`)
}
if (orphans.length > 20) console.log(`  … and ${orphans.length - 20} more`)

if (!DELETE) {
  console.log('\ndry run — nothing deleted. Re-run with --delete to remove them.')
  process.exit(0)
}

// del() takes up to 1000 urls at a time.
for (let i = 0; i < orphans.length; i += 500) {
  await del(orphans.slice(i, i + 500).map((b) => b.url))
}
console.log(`\ndeleted ${orphans.length} photos, freed ${mb(freed)} MB`)
