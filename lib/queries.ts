import 'server-only'
import { sql } from './db'
import type { Bottle, Note, Session } from './types'

/**
 * Every read here takes a groupId. That is the whole point: a session, its
 * bottles and its notes belong to one group, and nothing should be reachable
 * by guessing an id from outside it.
 */

export async function getSession(id: string, groupId: string): Promise<Session | undefined> {
  const rows = (await sql`
    select * from sessions where id = ${id} and group_id = ${groupId}
  `) as Session[]
  return rows[0]
}

export async function getBottles(sessionId: string): Promise<Bottle[]> {
  return (await sql`
    select * from bottles where session_id = ${sessionId} order by position
  `) as Bottle[]
}

/** This person's notes for a session, keyed by bottle. Drives every unlock. */
export async function getMyNotes(sessionId: string, userId: string): Promise<Map<string, Note>> {
  const rows = (await sql`
    select n.* from notes n
    join bottles b on b.id = n.bottle_id
    where b.session_id = ${sessionId} and n.user_id = ${userId}
  `) as Note[]
  return new Map(rows.map((n) => [n.bottle_id, n]))
}

/**
 * Who else in the group still owes a note on this bottle.
 *
 * The two-person version asked "has anyone other than me written?", which with
 * three people goes quiet as soon as the first of them does — telling you it is
 * safe to talk while someone is still writing. This asks the question that
 * actually matters, and names them so the screen can say who.
 */
export async function pendingTasters(
  bottleId: string,
  groupId: string,
  userId: string,
): Promise<string[]> {
  const rows = (await sql`
    select u.display_name
    from memberships m
    join users u on u.id = m.user_id
    where m.group_id = ${groupId}
      and m.user_id <> ${userId}
      and not exists (
        select 1 from notes n where n.bottle_id = ${bottleId} and n.user_id = m.user_id
      )
    order by u.display_name
  `) as { display_name: string }[]
  return rows.map((r) => r.display_name)
}

/**
 * The group a bottle belongs to, for the API routes to check against before
 * spending anything. Returns null for an id that does not exist.
 */
export async function groupForBottle(bottleId: string): Promise<string | null> {
  const rows = (await sql`
    select s.group_id from bottles b
    join sessions s on s.id = b.session_id
    where b.id = ${bottleId}
  `) as { group_id: string }[]
  return rows[0]?.group_id ?? null
}

export async function groupForSession(sessionId: string): Promise<string | null> {
  const rows = (await sql`
    select group_id from sessions where id = ${sessionId}
  `) as { group_id: string }[]
  return rows[0]?.group_id ?? null
}

/** Next session number for this group, so numbering never runs across groups. */
export async function nextSessionNumber(groupId: string): Promise<number> {
  const rows = (await sql`
    select coalesce(max(number), 0) + 1 as next from sessions where group_id = ${groupId}
  `) as { next: number }[]
  return rows[0].next
}

/** English list: "Sarah", "Sarah and Tom", "Sarah, Tom and Ana". */
export function nameList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
