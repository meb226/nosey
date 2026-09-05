-- Nosey schema. Canonical fresh install; `npm run db:push` applies it.
-- To move an existing single-household database onto this, run
-- db/migrations/001-groups-and-users.sql first.

-- ---------------------------------------------------------------- identity

-- A person. `external_id` is where a real auth provider's user id lands when
-- one is wired up; until then it stays null and the shared passphrase plus a
-- display name is what gets you a row. That is the same trust model as before
-- — what changed is that identity is now a stable id rather than a string
-- retyped on every device, so nothing has to be migrated again later.
create table if not exists users (
  id           uuid primary key default gen_random_uuid(),
  external_id  text unique,
  email        text unique,
  display_name text not null,
  created_at   timestamptz not null default now()
);

-- People who taste together. This is the unit the whole app is scoped to,
-- because the one rule — write yours before you read, hold off until they have
-- written theirs — only means anything among people drinking the same bottles
-- at the same table.
create table if not exists groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists memberships (
  group_id  uuid not null references groups(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  role      text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists memberships_user_idx on memberships (user_id);

-- The first group. Everyone who signs in with the shared passphrase lands
-- here, which preserves exactly the behaviour of the two-person version.
-- Once invite codes exist this is simply the oldest group.
insert into groups (id, name, invite_code)
values ('00000000-0000-0000-0000-000000000001', 'The house', 'house')
on conflict (id) do nothing;

-- ---------------------------------------------------------------- tastings

create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  number      integer not null,
  module      text,
  focus       text,
  blind       boolean not null default false,
  created_at  timestamptz not null default now(),
  -- Session numbers run per group, so one household's eighth session is not
  -- pushed to nine because a stranger started one.
  unique (group_id, number)
);

create index if not exists sessions_group_idx on sessions (group_id, created_at desc);

create table if not exists bottles (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references sessions(id) on delete cascade,
  position        integer not null,
  producer        text,
  wine            text,
  grape           text,
  region          text,
  country         text,
  vintage         integer,
  abv             numeric(4,2),
  price           numeric(8,2),
  retailer        text,
  label_photo_url text,
  unique (session_id, position)
);

create index if not exists bottles_session_idx on bottles (session_id);

create table if not exists notes (
  id             uuid primary key default gen_random_uuid(),
  bottle_id      uuid not null references bottles(id) on delete cascade,
  user_id        uuid not null references users(id) on delete cascade,

  -- structure: the six axes that get checked against reference values
  nose_intensity text,
  sweetness      text,
  acidity        text,
  tannin         text,
  body           text,
  alcohol        text,
  finish         text,

  -- flavour: reflected back, never graded
  nose_words     text[] not null default '{}',
  palate_words   text[] not null default '{}',

  score          integer,
  buy_again      boolean,
  drink_with     text,

  -- Per person, not per bottle: everything else here is per person, and a
  -- shared favourite would need a rule for the case where one of you loves it
  -- and the other doesn't. Distinct from buy_again on purpose — that one is
  -- practical, this one is memorable.
  favourite      boolean not null default false,

  -- Deferred blind mode. Stays null; cannot be retrofitted later without
  -- losing every session recorded before the change.
  blind_guess    text,
  blind_correct  boolean,

  takeaway       text,
  created_at     timestamptz not null default now(),

  -- Two people writing at once must produce two rows. Keyed on the user id
  -- rather than a typed name, so nobody can land on someone else's row by
  -- entering their name.
  unique (bottle_id, user_id)
);

create index if not exists notes_bottle_idx on notes (bottle_id);
create index if not exists notes_user_idx on notes (user_id);

-- ------------------------------------------------------------------ caches

-- An explanation costs about two cents and is non-deterministic, so
-- regenerating it on every page load would both cost more and quietly change
-- what you were told last time. Keyed per person because the structure check
-- is against that person's own calls.
create table if not exists explanations (
  bottle_id  uuid not null references bottles(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  body       jsonb not null,
  created_at timestamptz not null default now(),
  primary key (bottle_id, user_id)
);

-- The flight comparison is per session: it only unlocks once this person has
-- written a note for every bottle, so it cannot anchor one they have not made.
create table if not exists flight_notes (
  session_id uuid not null references sessions(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  body       jsonb not null,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

-- ------------------------------------------------------------- rate limits

-- Postgres-backed rather than in-memory, because serverless functions do not
-- share memory and an in-process counter would reset constantly. Fixed hourly
-- windows: crude, but the goal is stopping a runaway loop from spending the
-- API budget, not fair queueing.
create table if not exists rate_limits (
  user_id      uuid not null references users(id) on delete cascade,
  bucket       text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (user_id, bucket, window_start)
);

create index if not exists rate_limits_window_idx on rate_limits (window_start);
