create extension if not exists pgcrypto;

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sapid text unique not null,
  email text unique not null,
  phno text not null,
  code text unique not null,
  is_approved boolean not null default false,
  is_entered boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_reg_sapid on registrations(sapid);
create index if not exists idx_reg_code on registrations(code);
