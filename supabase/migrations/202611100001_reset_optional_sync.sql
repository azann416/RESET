-- Review and run ONCE in Supabase SQL Editor. No existing objects are replaced.
-- If names already exist, this transaction fails rather than modifying them.
begin;
create schema reset_private;
revoke all on schema reset_private from public, anon, authenticated;
create table reset_private.sync_verification (
  singleton boolean primary key default true check (singleton),
  policy_signature text,
  verified_at timestamptz
);
insert into reset_private.sync_verification(singleton) values (true);
revoke all on reset_private.sync_verification from public, anon, authenticated;
alter table reset_private.sync_verification enable row level security;
alter table reset_private.sync_verification force row level security;

create table public.reset_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal_category text not null check (goal_category in ('explore','reduce','break','sobriety','wellbeing')),
  start_date date not null check (start_date <= current_date + 1),
  progress_mode text not null default 'elapsed_days' check (progress_mode = 'elapsed_days'),
  revision uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);
alter table public.reset_progress enable row level security;
alter table public.reset_progress force row level security;
revoke all on public.reset_progress from public, anon, authenticated;
grant select, delete on public.reset_progress to authenticated;
grant insert(user_id, goal_category, start_date, progress_mode) on public.reset_progress to authenticated;
grant update(goal_category, start_date, progress_mode) on public.reset_progress to authenticated;

create function reset_private.policy_signature() returns text
language sql stable set search_path = '' as $$
  select md5(string_agg(p.polname || ':' || p.polcmd || ':' || p.polpermissive::text || ':' || p.polroles::text || ':' || coalesce(pg_get_expr(p.polqual,p.polrelid),'') || ':' || coalesce(pg_get_expr(p.polwithcheck,p.polrelid),''), '|' order by p.polname))
  from pg_catalog.pg_policy p where p.polrelid = 'public.reset_progress'::regclass;
$$;
revoke all on function reset_private.policy_signature() from public, anon, authenticated;

-- This gate is enforced by RLS, not merely by a frontend environment switch.
-- Editing the policies invalidates the verification signature and closes syncing.
create function public.reset_sync_ready() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select v.verified_at is not null
      and v.policy_signature = reset_private.policy_signature()
      and c.relrowsecurity and c.relforcerowsecurity
      and (select count(*) = 4 from pg_catalog.pg_policy where polrelid = c.oid)
    from reset_private.sync_verification v
    cross join pg_catalog.pg_class c
    where v.singleton and c.oid = 'public.reset_progress'::regclass
  ), false);
$$;
revoke all on function public.reset_sync_ready() from public, anon;
grant execute on function public.reset_sync_ready() to authenticated;

create policy reset_select_own on public.reset_progress for select to authenticated
  using ((select public.reset_sync_ready()) and (select auth.uid()) = user_id);
create policy reset_insert_own on public.reset_progress for insert to authenticated
  with check ((select public.reset_sync_ready()) and (select auth.uid()) = user_id);
create policy reset_update_own on public.reset_progress for update to authenticated
  using ((select public.reset_sync_ready()) and (select auth.uid()) = user_id)
  with check ((select public.reset_sync_ready()) and (select auth.uid()) = user_id);
create policy reset_delete_own on public.reset_progress for delete to authenticated
  using ((select public.reset_sync_ready()) and (select auth.uid()) = user_id);

create function reset_private.bump_progress_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.revision := gen_random_uuid();
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function reset_private.bump_progress_revision() from public, anon, authenticated;
create trigger reset_progress_revision before update on public.reset_progress
  for each row execute function reset_private.bump_progress_revision();
commit;
-- Uploads remain blocked until the separate isolation test passes.
