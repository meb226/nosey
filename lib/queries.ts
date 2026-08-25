import { sql } from './db'
import type { Bottle, Note, Session } from './types'

export async function getSession(id: string): Promise<Session | undefined> {
  const rows = (await sql`select * from sessions where id = ${id}`) as Session[]
  return rows[0]
}

export async function getBottles(sessionId: string): Promise<Bottle[]> {
  return (await sql`
    select * from bottles where session_id = ${sessionId} order by position
  `) as Bottle[]
}

/** This taster's notes for a session, keyed by bottle. Drives every unlock. */
export async function getMyNotes(sessionId: string, taster: string): Promise<Map<string, Note>> {
  const rows = (await sql`
    select n.* from notes n
    join bottles b on b.id = n.bottle_id
    where b.session_id = ${sessionId} and n.taster = ${taster}
  `) as Note[]
  return new Map(rows.map((n) => [n.bottle_id, n]))
}

/**
 * Whether the other taster has written this bottle yet. Drives the quiet
 * "hold off talking about it" line — the whole enforcement mechanism.
 */
export async function othersPending(bottleId: string, taster: string): Promise<boolean> {
  const rows = (await sql`
    select count(*)::int as n from notes where bottle_id = ${bottleId} and taster <> ${taster}
  `) as { n: number }[]
  return rows[0].n === 0
}
