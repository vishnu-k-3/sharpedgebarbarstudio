-- ============================================================
-- Run this ONCE in Supabase → SQL Editor → New query → Run
-- (Free plan, no credit card needed)
-- ============================================================
create table if not exists bookings (
  id          text primary key,
  date        date        not null,
  start_time  text        not null,   -- "HH:MM" 24h
  end_time    text        not null,   -- "HH:MM" 24h
  service_id  text        not null,
  service_name text,
  duration    int         not null,   -- minutes
  price       text,
  name        text        not null,
  phone       text        not null,
  status      text        not null default 'confirmed',
  created_at  timestamptz not null default now()
);

create index if not exists bookings_date_idx on bookings (date);

-- Row Level Security: enable it with NO policies, so nobody can
-- read/write with the public anon key. Our API uses the private
-- service-role key on the server, which bypasses RLS.
alter table bookings enable row level security;

-- The API role must be allowed to touch the table. Tables created
-- via the SQL editor sometimes miss these grants and show
-- "permission denied for table bookings" — so we grant explicitly.
grant usage on schema public to service_role, anon, authenticated;

grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
