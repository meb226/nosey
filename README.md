# Nosey

A tasting log for two people learning wine, that explains what you just drank
*after* you've written down what you noticed.

Not a blind tasting app. You look at the label, you know it's a Chablis. The
rule is about **ordering, not concealment**: write your note first, get the
explanation second. Reading descriptors before you taste turns learning into
memorization, and that's the failure this exists to prevent.

**No explanation renders until that person has submitted their own note for
that bottle.** It unlocks per-person, on their own submission — no waiting on
the other taster, no gate, no 403. If she hasn't written hers yet, the screen
shows a quiet "hold off talking about it" line. That's the whole enforcement
mechanism. Etiquette, not architecture.

Structure gets checked. Flavors never get graded.

## Stack

- Next.js 16 App Router on Vercel
- Neon Postgres via the Vercel Marketplace (`@neondatabase/serverless`)
- `claude-sonnet-5` for explanations and label OCR
- Vercel Blob for label photos
- Signed cookie carrying `taster`; shared passphrase, two users
- Installable PWA, **iPhone only** — Safari/WebKit is the entire test surface

`@vercel/postgres` and `@vercel/kv` are sunset. Do not use them.

## Groups

Everything is scoped to a **group** — the people who taste together. That is
the unit because the one rule only means anything among people drinking the
same bottles at the same table: your cellar, your session numbering and the
hold-off line are all per group.

Signing in with the shared passphrase puts you in the default group ("The
house"). Invite codes exist in the schema and are not wired up yet.

**What the passphrase still does not do:** anyone holding it can claim any
display name and land on that person's row. That was true before groups too.
What changed is that identity is now a stable id rather than a string retyped
on every device, so putting a real auth provider behind it means setting
`users.external_id` and reading it in `lib/auth.ts` — no second data migration.

## Setup

```bash
npm install
cp .env.local.example .env.local   # then fill it in
npm run db:push                    # applies db/schema.sql
npm run dev
```

Already have a database on the two-person schema?

```bash
npm run db:migrate -- 001
```

It backfills a user per distinct taster name, puts every session in the default
group, and re-keys the three taster-keyed tables. Safe to re-run.

**Rehearse it on a Neon branch before running it on real notes.** It drops
columns. A passing test suite is good evidence, not a guarantee about your
data — and branching is instant and free, so there is no reason not to.

## Tests

```bash
npm test
```

Runs three suites against real Postgres — PGlite, compiled to WASM, so there is
no database or container to set up and no credentials to hold. They cover what a
typecheck cannot:

- **`test:sql`** — that `db:push` and `db:migrate` can actually apply the files.
  They send one statement at a time, so the splitter is all that stands between
  a schema file and a database.
- **`test:db`** — that one group's data is invisible to another, that session
  numbering is per group, that two people writing the same bottle produce two
  rows, and that rate limits are per person.
- **`test:migration`** — that the migration loses nothing and survives a second
  run.

Deliberately not pointed at Neon: `test:migration` drops columns and `test:db`
inserts junk, so neither can be run against the database holding your notes.
The comparison is PGlite against a *throwaway* database, not against Neon — and
in-memory is faster, needs no credentials, and works on a fresh clone.

Both bugs found here were found by these: a migration that claimed to be
re-runnable and wasn't, and a semicolon inside a comment that would have made
`db:push` fail on the schema's own header line.

Five environment variables, all listed in `.env.local.example`. `DATABASE_URL`
and `BLOB_READ_WRITE_TOKEN` are injected by Vercel once the Neon and Blob
stores exist — `vercel env pull .env.local` brings them down. The other three
you set yourself.

Generate the cookie secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## The home-screen icon

Drop a logo at `assets/logo.svg` (or `.png`) and run:

```bash
npm run icons
```

It writes `app/apple-icon.png`, `app/icon.png` and the manifest sizes under
`public/`. Pass a path to use a file somewhere else: `npm run icons -- ~/logo.svg`.

Three iOS facts the script exists to handle, all of which bite silently:

- **The apple icon must be opaque.** iOS composites transparency onto black, so
  a transparent logo lands on the home screen in a black box. Every output is
  flattened onto the ground colour.
- **Do not pre-round the corners.** iOS applies its own superellipse mask. A
  logo that already has rounded corners gets rounded twice and reads as inset
  and slightly wrong. Supply a full-bleed square.
- **iOS uses `apple-icon.png` for the home screen, not the manifest icons.** The
  manifest entries are for Android and desktop. Both get generated. Android's
  maskable icon carries extra padding because the launcher crops it to a circle.

The current icon is a drawn placeholder, not a real mark.

## Installing on a phone

iOS has no install prompt — Safari doesn't implement `beforeinstallprompt`, so
there is deliberately no install-prompt component. Share → Add to Home Screen,
by hand, once per phone. An installed iOS PWA has its own storage partition
separate from Safari, so expect to sign in again inside the installed app.

## iOS constraints worth not relearning

These are load-bearing, not preferences:

- **Text inputs are 16px minimum.** Below that Safari zooms the viewport on
  focus and never zooms back. Enforced in `app/globals.css`; don't override it.
- `100dvh`, never `100vh`.
- No hover states. `-webkit-tap-highlight-color: transparent` plus an explicit
  `:active`.
- `viewport-fit=cover` and `env(safe-area-inset-bottom)` — the taste screen's
  save button sits where the home indicator is.
- Pull-to-refresh fires in standalone and will reload mid-session. Notes are
  written per bottle on completion, and the taste screen resumes at the first
  bottle you haven't written, so a reload costs nothing.
- Screen Wake Lock is Safari 18.4+ and home-screen web apps only. It's a no-op
  in the browser, which is why `lib/useWakeLock.ts` feature-checks rather than
  wrapping a missing API in a try/catch.
- `/session/*` and `/cellar` are never served stale. Worth knowing before you
  try to "fix" this: Next **overrides Cache-Control on dynamically rendered App
  Router responses**, so neither a `headers()` rule in `next.config.mjs` nor a
  `middleware.ts` can set `no-store` on them — both were tried and measured, and
  a probe header proved middleware runs while its Cache-Control is discarded.
  What every one of these routes actually returns is `no-cache, must-revalidate`,
  from `export const dynamic = 'force-dynamic'`. That satisfies the intent (the
  browser always revalidates, the server always re-renders); it is not the
  literal `no-store` MIK-33 asks for. The gap only matters on a shared machine,
  which two phones are not.

## Layout

```
app/
  page.tsx                    sign in, or home — counts, recent, cellar
  session/new/                session setup, label photo, OCR prefill
  session/[id]/taste/         the accordion, one bottle at a time
  session/[id]/learn/         the explanation, gated per taster per bottle
  cellar/                     everything, searchable and filterable
  preview/                    dev-only: the taste screen with no database
  api/
    auth  notes  sessions  upload
    ocr                       label → structured fields (vision)
    explain                   per-bottle explanation
    flight                    the comparison, gated on all bottles
lib/
  axes.ts       what the taste screen asks, in order, with its two colours
  axisInfo.ts   what each axis means — definitions only, never a reference value
  auth.ts       HMAC-signed taster cookie
  db.ts         Neon client, lazily constructed
  queries.ts    the reads that drive every unlock
  types.ts      structure axes and row types
components/     TasteForm (the accordion), NewSessionForm (intake), …
design/         working files for the design canvas
db/schema.sql
```

## The taste screen

One folder open at a time. Picking a value collapses it and opens the next,
so a note is a guided pass rather than a wall of controls. Five options across
375px was the original layout and it did not survive contact with a phone.

The design rule underneath it: **a row is dark with white type; a surface you
type into is white with dark type.** Row state is a whole block of colour, not
a tint — nobody should have to judge a subtle difference two glasses in.

Each axis carries two colours in `lib/axes.ts`. `chip` is the saturated tile on
the folder header; `fill` is the lighter tint a selected option fills with. One
colour cannot do both: saturated enough to read on `#9900cc` is too dark to
carry near-black option text.

`lib/axisInfo.ts` defines each axis and how to perceive it, and deliberately
never names a grape, region or typical value. Defining an axis is teaching;
saying what a bottle should measure is the anchoring this app exists to
prevent.

`lib/db.ts` and `lib/anthropic.ts` import `server-only`, so a client component
that reaches for either fails the build rather than shipping a key.

## Schema notes

`blind` defaults false, and `blind_guess` / `blind_correct` stay null. Blind
mode is deferred, not deleted — those columns cost nothing now and can't be
retrofitted later without losing every session recorded before the change.

`UNIQUE (bottle_id, taster)` is what makes two people writing at once produce
two rows. The notes upsert keys on it, so editing your own note never touches
the other person's.

`explanations` and `flight_notes` are additive cache tables not in the original
spec: an explanation costs ~2 cents and is non-deterministic, so regenerating
on every page load would both cost more and quietly change what you were told
last time.

## Cost

~2 cents per explanation, ~$1/year at 50 sessions. No prompt caching, no batch,
no model routing — the model is picked on explanation quality alone.

The failure mode to watch for is an explanation that won't say "you both called
this medium acid and it isn't." The structure check returns a `verdict` enum
rather than prose specifically so that softening is structurally awkward.
