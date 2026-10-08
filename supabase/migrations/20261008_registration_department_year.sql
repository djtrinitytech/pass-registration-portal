-- Upgrade the existing live table; preserve all registrations.
begin;
alter table public.registrations add column if not exists department text;
alter table public.registrations add column if not exists year smallint check (year between 1 and 4);
notify pgrst, 'reload schema';
commit;
