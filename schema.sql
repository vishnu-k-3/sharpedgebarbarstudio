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
