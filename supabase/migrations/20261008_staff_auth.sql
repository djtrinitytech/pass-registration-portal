-- Persistent login throttling and revocable staff sessions. Server-only access.
begin;
alter table public.registrations enable row level security;
revoke all on public.registrations from anon, authenticated;
create table if not exists public.staff_sessions (
  token_hash text primary key,
  role text not null check (role in ('desk', 'gate')),
  credential_version text not null,
  expires_at timestamptz not null
);
create index if not exists staff_sessions_expiry on public.staff_sessions(expires_at);
alter table public.staff_sessions enable row level security;
revoke all on public.staff_sessions from anon, authenticated;
grant select, insert, delete on public.staff_sessions to service_role;

create table if not exists public.staff_login_attempts (
  bucket text primary key,
  attempts integer not null,
  window_started_at timestamptz not null
);
alter table public.staff_login_attempts enable row level security;
revoke all on public.staff_login_attempts from anon, authenticated;
create or replace function public.staff_login_allowed(bucket_key text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare attempt_count integer;
begin
  insert into public.staff_login_attempts as a (bucket, attempts, window_started_at)
  values (bucket_key, 1, now())
  on conflict (bucket) do update set
    attempts = case when a.window_started_at < now() - interval '15 minutes' then 1 else a.attempts + 1 end,
    window_started_at = case when a.window_started_at < now() - interval '15 minutes' then now() else a.window_started_at end
  returning attempts into attempt_count;
  return attempt_count <= 8;
end;
$$;
revoke execute on function public.staff_login_allowed(text) from public, anon, authenticated;
grant execute on function public.staff_login_allowed(text) to service_role;
notify pgrst, 'reload schema';
commit;
