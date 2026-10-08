create extension if not exists pgcrypto;

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sapid text unique not null,
  email text unique not null,
  phno text not null,
  department text,
  year smallint check (year between 1 and 4),
  code text unique not null,
  is_approved boolean not null default false,
  is_entered boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_reg_sapid on registrations(sapid);
create index if not exists idx_reg_code on registrations(code);

-- Also upgrades an existing event database without changing existing attendees.
alter table registrations add column if not exists department text;
alter table registrations add column if not exists year smallint check (year between 1 and 4);
notify pgrst, 'reload schema';
