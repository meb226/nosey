import { neon } from '@neondatabase/serverless'
import { readFile } from 'node:fs/promises'
import { splitStatements } from './sql-split.mjs'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set. Add it to .env.local, or run:')
  console.error('  vercel env pull .env.local')
  process.exit(1)
}

const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8')
const sql = neon(url)
const statements = splitStatements(schema)

for (const statement of statements) {
  await sql.query(statement)
}

console.log(`applied ${statements.length} statements from db/schema.sql`)
