-- Wino v1 schema. Run against the Neon database once.

create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  number      integer not null,
  module      text,
  focus       text,
  blind       boolean not null default false,
  created_at  timestamptz not null default now()
);

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

create table if not exists notes (
  id             uuid primary key default gen_random_uuid(),
  bottle_id      uuid not null references bottles(id) on delete cascade,
  taster         text not null,

  -- structure: the six axes that get checked against reference values
  nose_intensity text,
  sweetness      text,
  acidity        text,
  tannin         text,
  body           text,
  alcohol        text,
  finish         text,

  -- flavor: reflected back, never graded
  nose_words     text[] not null default '{}',
  palate_words   text[] not null default '{}',

  score          integer,
  buy_again      boolean,
  drink_with     text,

  -- Per taster, not per bottle: everything else in this app is per taster,
  -- and a shared favourite would need a rule for the case where one of you
  -- loves it and the other doesn't. Distinct from buy_again on purpose —
  -- buy_again is practical, favourite is memorable.
  favourite      boolean not null default false,

  -- deferred blind mode. Stays null in v1; cannot be retrofitted later
  -- without losing every session recorded before the change.
  blind_guess    text,
  blind_correct  boolean,

  takeaway       text,
  created_at     timestamptz not null default now(),

  -- two people writing at once must produce two rows
  unique (bottle_id, taster)
);

create index if not exists notes_bottle_idx   on notes (bottle_id);
create index if not exists bottles_session_idx on bottles (session_id);
create index if not exists sessions_number_idx on sessions (number desc);

-- Not in the MIK-33 schema block. Additive cache table: an explanation costs
-- ~2 cents and is non-deterministic, so regenerating it on every page load
-- would both cost more and quietly change what you were told last time.
-- Keyed per taster because the structure check is against that taster's calls.
create table if not exists explanations (
  bottle_id  uuid not null references bottles(id) on delete cascade,
  taster     text not null,
  body       jsonb not null,
  created_at timestamptz not null default now(),
  primary key (bottle_id, taster)
);

-- The flight comparison is per session, not per bottle: it only unlocks once
-- this taster has written a note for every bottle, so it can't anchor a note
-- they haven't made yet.
create table if not exists flight_notes (
  session_id uuid not null references sessions(id) on delete cascade,
  taster     text not null,
  body       jsonb not null,
  created_at timestamptz not null default now(),
  primary key (session_id, taster)
);

-- Additive migrations. Kept idempotent so `npm run db:push` stays safe to
-- re-run against a database created before the column existed.
alter table notes add column if not exists favourite boolean not null default false;
