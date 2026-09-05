-- Moves a database created by the two-person schema onto groups and user ids.
--
-- Safe to run on a fresh database and safe to re-run: every step that depends
-- on the old `taster` column is guarded on that column still existing, so a
-- second run is a no-op rather than an error. (The first version of this file
-- was not, and the migration test caught it.)
--
-- If you have never set DATABASE_URL you do not need this at all — plain
-- `npm run db:push` creates the new shape directly.

begin;

-- ------------------------------------------------- identity tables first

create table if not exists users (
  id           uuid primary key default gen_random_uuid(),
  external_id  text unique,
  email        text unique,
  display_name text not null,
  created_at   timestamptz not null default now()
);

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

insert into groups (id, name, invite_code)
values ('00000000-0000-0000-0000-000000000001', 'The house', 'house')
on conflict (id) do nothing;

-- ------------------------------------------------- sessions join a group

alter table sessions add column if not exists group_id uuid references groups(id) on delete cascade;
update sessions set group_id = '00000000-0000-0000-0000-000000000001' where group_id is null;
alter table sessions alter column group_id set not null;

-- Session numbers were global and are now per group. With a single group the
-- existing numbers are already unique, so this cannot collide here.
alter table sessions drop constraint if exists sessions_group_id_number_key;
alter table sessions add constraint sessions_group_id_number_key unique (group_id, number);

-- ------------------------------------- re-key the taster-keyed tables
--
-- Each block is a no-op once its `taster` column is gone, which is what makes
-- the whole file re-runnable.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'notes' and column_name = 'taster'
  ) then
    -- One users row per distinct name that has ever written a note.
    insert into users (display_name)
    select distinct n.taster from notes n
    where not exists (select 1 from users u where u.display_name = n.taster);

    insert into memberships (group_id, user_id)
    select '00000000-0000-0000-0000-000000000001', id from users
    on conflict do nothing;

    alter table notes add column if not exists user_id uuid references users(id) on delete cascade;
    update notes n set user_id = u.id from users u where u.display_name = n.taster and n.user_id is null;
    alter table notes alter column user_id set not null;
    alter table notes drop constraint if exists notes_bottle_id_taster_key;
    alter table notes add constraint notes_bottle_id_user_id_key unique (bottle_id, user_id);
    alter table notes drop column taster;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'explanations' and column_name = 'taster'
  ) then
    alter table explanations add column if not exists user_id uuid references users(id) on delete cascade;
    update explanations e set user_id = u.id from users u where u.display_name = e.taster and e.user_id is null;
    -- A cached explanation for a name that never wrote a note has nothing to
    -- attach to, and it regenerates on next view for two cents.
    delete from explanations where user_id is null;
    alter table explanations drop constraint if exists explanations_pkey;
    alter table explanations add primary key (bottle_id, user_id);
    alter table explanations drop column taster;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'flight_notes' and column_name = 'taster'
  ) then
    alter table flight_notes add column if not exists user_id uuid references users(id) on delete cascade;
    update flight_notes f set user_id = u.id from users u where u.display_name = f.taster and f.user_id is null;
    delete from flight_notes where user_id is null;
    alter table flight_notes drop constraint if exists flight_notes_pkey;
    alter table flight_notes add primary key (session_id, user_id);
    alter table flight_notes drop column taster;
  end if;
end $$;

-- ------------------------------------------------------------ rate limits

create table if not exists rate_limits (
  user_id      uuid not null references users(id) on delete cascade,
  bucket       text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (user_id, bucket, window_start)
);

create index if not exists rate_limits_window_idx on rate_limits (window_start);

commit;
