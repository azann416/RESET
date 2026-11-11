-- Repair only the RESET sync objects on an existing public.reset_progress table.
-- Run the whole script as postgres with BYPASSRLS after reviewing it.
-- This transaction preserves progress rows and leaves the sync gate disabled.
begin;

do $$
declare
  v_bypass_rls boolean;
  v_table_owner name;
begin
  select rolbypassrls into v_bypass_rls
  from pg_catalog.pg_roles
  where rolname = current_user;

  if current_user <> 'postgres' or coalesce(v_bypass_rls, false) is not true then
    raise exception 'Run this repair as the postgres role with BYPASSRLS';
  end if;

  select pg_catalog.pg_get_userbyid(c.relowner)::name into v_table_owner
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'reset_progress' and c.relkind = 'r';

  if v_table_owner is null then
    raise exception 'Expected existing table public.reset_progress was not found';
  end if;
  if v_table_owner <> current_user then
    raise exception 'public.reset_progress is not owned by postgres; repair stopped without changing it';
  end if;

  if exists (
    select required.column_name, required.udt_name
    from (values
      ('user_id', 'uuid'),
      ('goal_category', 'text'),
      ('start_date', 'date'),
      ('progress_mode', 'text'),
      ('revision', 'uuid'),
      ('updated_at', 'timestamptz')
    ) as required(column_name, udt_name)
    where not exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'reset_progress'
        and c.column_name = required.column_name
        and c.udt_name = required.udt_name
    )
  ) then
    raise exception 'public.reset_progress is missing expected columns; repair stopped without changing it';
  end if;
end $$;

create schema if not exists reset_private;
revoke all on schema reset_private from public, anon, authenticated;

create table if not exists reset_private.sync_verification (
  singleton boolean primary key default true check (singleton),
  policy_signature text,
  verified_at timestamptz
);

do $$
declare
  v_table_owner name;
begin
  select pg_catalog.pg_get_userbyid(c.relowner)::name into v_table_owner
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'reset_private'
    and c.relname = 'sync_verification'
    and c.relkind = 'r';

  if v_table_owner <> current_user then
    raise exception 'reset_private.sync_verification is not owned by postgres; repair stopped';
  end if;

  if exists (
    select required.column_name, required.udt_name
    from (values
      ('singleton', 'bool'),
      ('policy_signature', 'text'),
      ('verified_at', 'timestamptz')
    ) as required(column_name, udt_name)
    where not exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'reset_private'
        and c.table_name = 'sync_verification'
        and c.column_name = required.column_name
        and c.udt_name = required.udt_name
    )
  ) then
    raise exception 'reset_private.sync_verification has an unexpected structure; repair stopped';
  end if;
end $$;

insert into reset_private.sync_verification(singleton, policy_signature, verified_at)
values (true, null, null)
on conflict (singleton) do nothing;

revoke all on reset_private.sync_verification from public, anon, authenticated;
alter table reset_private.sync_verification enable row level security;
alter table reset_private.sync_verification force row level security;

-- Keep an existing verification marker closed; verification remains a separate step.
update reset_private.sync_verification
set policy_signature = null, verified_at = null
where singleton;

alter table public.reset_progress enable row level security;
alter table public.reset_progress force row level security;
revoke all on public.reset_progress from public, anon, authenticated;
grant select, delete on public.reset_progress to authenticated;
grant insert(user_id, goal_category, start_date, progress_mode) on public.reset_progress to authenticated;
grant update(goal_category, start_date, progress_mode) on public.reset_progress to authenticated;

create or replace function reset_private.policy_signature() returns text
language sql stable set search_path = '' as $$
  select md5(string_agg(
    p.polname || ':' || p.polcmd::text || ':' || p.polpermissive::text || ':' ||
    p.polroles::text || ':' || coalesce(pg_get_expr(p.polqual, p.polrelid), '') || ':' ||
    coalesce(pg_get_expr(p.polwithcheck, p.polrelid), ''),
    '|' order by p.polname
  ))
  from pg_catalog.pg_policy p
  where p.polrelid = 'public.reset_progress'::regclass;
$$;
revoke all on function reset_private.policy_signature() from public, anon, authenticated;

create or replace function public.reset_sync_ready() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select v.verified_at is not null
      and v.policy_signature = reset_private.policy_signature()
      and c.relrowsecurity and c.relforcerowsecurity
      and (select count(*) = 4
           from pg_catalog.pg_policy
           where polrelid = c.oid)
    from reset_private.sync_verification v
    cross join pg_catalog.pg_class c
    where v.singleton and c.oid = 'public.reset_progress'::regclass
  ), false);
$$;
revoke all on function public.reset_sync_ready() from public, anon, authenticated;
grant execute on function public.reset_sync_ready() to authenticated;

-- Refuse to alter any unexpected policy; replace only these four RESET policies.
do $$
begin
  if exists (
    select 1
    from pg_catalog.pg_policy p
    where p.polrelid = 'public.reset_progress'::regclass
      and p.polname not in (
        'reset_select_own',
        'reset_insert_own',
        'reset_update_own',
        'reset_delete_own'
      )
  ) then
    raise exception 'Unexpected policy exists on public.reset_progress; review policies before repair';
  end if;
end $$;

drop policy if exists reset_select_own on public.reset_progress;
drop policy if exists reset_insert_own on public.reset_progress;
drop policy if exists reset_update_own on public.reset_progress;
drop policy if exists reset_delete_own on public.reset_progress;

create policy reset_select_own on public.reset_progress for select to authenticated
  using ((select public.reset_sync_ready()) and (select auth.uid()) = user_id);
create policy reset_insert_own on public.reset_progress for insert to authenticated
  with check ((select public.reset_sync_ready()) and (select auth.uid()) = user_id);
create policy reset_update_own on public.reset_progress for update to authenticated
  using ((select public.reset_sync_ready()) and (select auth.uid()) = user_id)
  with check ((select public.reset_sync_ready()) and (select auth.uid()) = user_id);
create policy reset_delete_own on public.reset_progress for delete to authenticated
  using ((select public.reset_sync_ready()) and (select auth.uid()) = user_id);

create or replace function reset_private.bump_progress_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.revision := gen_random_uuid();
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function reset_private.bump_progress_revision() from public, anon, authenticated;

do $$
declare
  v_trigger_function oid;
  v_trigger_enabled "char";
  v_trigger_type smallint;
begin
  select t.tgfoid, t.tgenabled, t.tgtype
    into v_trigger_function, v_trigger_enabled, v_trigger_type
  from pg_catalog.pg_trigger t
  where t.tgrelid = 'public.reset_progress'::regclass
    and t.tgname = 'reset_progress_revision'
    and not t.tgisinternal;

  if v_trigger_function is null then
    create trigger reset_progress_revision
      before update on public.reset_progress
      for each row execute function reset_private.bump_progress_revision();
  elsif v_trigger_function <> 'reset_private.bump_progress_revision()'::regprocedure
      or v_trigger_enabled <> 'O'
      or v_trigger_type <> 19 then
    raise exception 'Unexpected reset_progress_revision trigger; review it before repair';
  end if;
end $$;

do $$
declare
  v_owner oid := (select oid from pg_catalog.pg_roles where rolname = current_user);
begin
  if not exists (
    select 1 from pg_catalog.pg_proc p
    where p.oid = 'public.reset_sync_ready()'::regprocedure
      and p.proowner = v_owner and p.prosecdef
  ) then
    raise exception 'reset_sync_ready must be SECURITY DEFINER owned by postgres';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_proc p
    where p.oid in (
      'reset_private.policy_signature()'::regprocedure,
      'reset_private.bump_progress_revision()'::regprocedure
    )
      and (p.proowner <> v_owner or p.prosecdef)
  ) then
    raise exception 'Private helper functions must be postgres-owned and not SECURITY DEFINER';
  end if;

  if (select count(*) from pg_catalog.pg_policy
      where polrelid = 'public.reset_progress'::regclass) <> 4 then
    raise exception 'Expected exactly four owner-only RESET policies';
  end if;

  if public.reset_sync_ready() then
    raise exception 'Sync gate unexpectedly open; repair must leave it disabled';
  end if;
end $$;

commit;
