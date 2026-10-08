-- Track SMTP acceptance separately from desk approval. Never assume old approvals were emailed.
begin;
alter table public.staff_sessions drop constraint if exists staff_sessions_role_check;
alter table public.staff_sessions add constraint staff_sessions_role_check check (role in ('desk','gate','super'));
alter table public.registrations add column if not exists email_status text;
alter table public.registrations add column if not exists email_attempt_id uuid;
alter table public.registrations add column if not exists email_attempt_started_at timestamptz;
alter table public.registrations add column if not exists email_sent_at timestamptz;
alter table public.registrations add column if not exists email_last_note text;
update public.registrations set email_status = case when is_approved then 'unknown' else 'pending' end where email_status is null;
alter table public.registrations alter column email_status set default 'pending';
alter table public.registrations alter column email_status set not null;
alter table public.registrations drop constraint if exists registrations_email_status_check;
alter table public.registrations add constraint registrations_email_status_check check (email_status in ('pending','sending','sent','failed','unknown'));

create table if not exists public.mail_control (
  singleton boolean primary key default true check (singleton),
  paused boolean not null default false,
  note text not null default '',
  daily_budget integer not null default 300 check (daily_budget between 1 and 300)
);
insert into public.mail_control (singleton) values (true) on conflict do nothing;
create table if not exists public.mail_attempts (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id),
  sender_key text not null,
  status text not null check (status in ('sending','sent','failed','unknown')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  note text
);
create index if not exists mail_attempts_started_at on public.mail_attempts(started_at);
create index if not exists mail_attempts_sender_started_at on public.mail_attempts(sender_key,started_at);
create table if not exists public.mail_sender_settings (
  singleton boolean primary key default true check (singleton),
  encrypted_credentials text not null,
  updated_at timestamptz not null default now()
);
alter table public.mail_sender_settings enable row level security;
alter table public.mail_control enable row level security;
alter table public.mail_attempts enable row level security;
revoke all on public.mail_control, public.mail_attempts, public.mail_sender_settings from anon, authenticated;
grant select, insert, update on public.mail_sender_settings to service_role;
grant select, update on public.mail_control to service_role;
grant select on public.mail_attempts to service_role;

create or replace function public.claim_pass_email(registration_code text, allow_uncertain boolean, sender_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.registrations%rowtype; c public.mail_control%rowtype; attempt uuid; used integer;
begin
  if sender_key is null or sender_key !~ '^[a-f0-9]{64}$' then raise exception 'Invalid sender key'; end if;
  select * into c from public.mail_control where singleton = true for update;
  if not found or c.paused then return jsonb_build_object('state','paused','message','Email sending is paused. Contact the super admin.'); end if;
  select count(*) into used from public.mail_attempts a where a.sender_key = $3 and started_at > now() - interval '24 hours' and status in ('sending','sent','unknown');
  if used >= c.daily_budget then return jsonb_build_object('state','quota','message','This sender has reached its 300-email safety budget. Wait for the rolling 24-hour window or ask the owner to choose an eligible sender.'); end if;
  select * into r from public.registrations where code = registration_code for update;
  if not found then return jsonb_build_object('state','missing','message','Registration not found.'); end if;
  if r.is_entered then return jsonb_build_object('state','entered','message','This pass has already been used.'); end if;
  if r.email_status = 'sent' then return jsonb_build_object('state','sent','message','Email was already accepted by the mail provider.'); end if;
  if r.email_status = 'sending' and (not allow_uncertain or r.email_attempt_started_at > now() - interval '5 minutes') then
    return jsonb_build_object('state','sending','message','An email attempt is already in progress. Do not resend it.');
  end if;
  if r.email_status = 'unknown' and not allow_uncertain then return jsonb_build_object('state','unknown','message','Previous email outcome is uncertain. Ask the super admin to review before retrying.'); end if;
  if r.email_status = 'sending' then update public.mail_attempts set status = 'unknown', note = 'Stale attempt reviewed by super admin.' where id = r.email_attempt_id and status = 'sending'; end if;
  insert into public.mail_attempts (registration_id,status,sender_key) values (r.id,'sending',$3) returning id into attempt;
  update public.registrations set is_approved = true, email_status = 'sending', email_attempt_id = attempt, email_attempt_started_at = now(), email_last_note = 'Email attempt in progress.' where id = r.id returning * into r;
  return jsonb_build_object('state','claimed','student',jsonb_build_object('id',r.id,'name',r.name,'email',r.email,'sapid',r.sapid,'code',r.code,'email_attempt_id',attempt));
end;
$$;
create or replace function public.finish_pass_email(attempt_id uuid, outcome text, outcome_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare reg_id uuid;
begin
  if outcome not in ('sent','failed','unknown') then raise exception 'Invalid mail outcome'; end if;
  select registration_id into reg_id from public.mail_attempts where id = attempt_id;
  if not found then raise exception 'Mail attempt not found'; end if;
  update public.registrations set email_status = outcome, email_last_note = left(outcome_note,1000), email_sent_at = case when outcome = 'sent' then now() else email_sent_at end where id = reg_id and email_attempt_id = attempt_id and email_status = 'sending';
  update public.mail_attempts set status = outcome, completed_at = now(), note = left(outcome_note,1000) where id = attempt_id and status in ('sending','unknown');
end;
$$;
revoke execute on function public.claim_pass_email(text,boolean,text) from public, anon, authenticated;
revoke execute on function public.finish_pass_email(uuid,text,text) from public, anon, authenticated;
grant execute on function public.claim_pass_email(text,boolean,text) to service_role;
grant execute on function public.finish_pass_email(uuid,text,text) to service_role;
notify pgrst, 'reload schema';
commit;
