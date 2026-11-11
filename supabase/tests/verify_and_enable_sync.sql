-- Run the ENTIRE script as postgres in Supabase SQL Editor after the migration.
-- Replace the two UUIDs with DIFFERENT, disposable Auth test users you created.
-- Tests are rolled back; existing progress for these IDs is restored.
-- Verification is enabled only if every assertion succeeds in this transaction.
begin;
select set_config('reset.test_a', '289ee3e9-cdcc-41c7-8e66-ca6467aeb386', true);
select set_config('reset.test_b', 'd4968b7c-afaf-482e-aa87-326dc7e30db2', true);
do $$
begin
  if current_setting('reset.test_a')::uuid = current_setting('reset.test_b')::uuid then raise exception 'Use two different Auth users'; end if;
  if (select count(*) from auth.users where id in (current_setting('reset.test_a')::uuid,current_setting('reset.test_b')::uuid)) <> 2 then raise exception 'Both test Auth users must exist'; end if;
end $$;
savepoint before_test_data;
-- Temporary, transaction-local enablement so assertions exercise the actual policies.
update reset_private.sync_verification set policy_signature = reset_private.policy_signature(), verified_at = now();
delete from public.reset_progress where user_id in (current_setting('reset.test_a')::uuid,current_setting('reset.test_b')::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('reset.test_a'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('reset.test_a'),'role','authenticated')::text,true);
do $$
begin
  if not public.reset_sync_ready() then raise exception 'RLS verification gate failed'; end if;
end $$;
insert into public.reset_progress(user_id,goal_category,start_date) values (auth.uid(),'wellbeing',current_date);
select set_config('reset.test_revision',(select revision::text from public.reset_progress where user_id=auth.uid()),true);
do $$
declare n integer;
begin
  if (select count(*) from public.reset_progress) <> 1 then raise exception 'Owner read failed'; end if;
  update public.reset_progress set goal_category='explore' where user_id=auth.uid() and revision=current_setting('reset.test_revision')::uuid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Owner update failed'; end if;
  update public.reset_progress set goal_category='break' where user_id=auth.uid() and revision=current_setting('reset.test_revision')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Stale revision update was allowed'; end if;
  if (select revision from public.reset_progress where user_id=auth.uid()) = current_setting('reset.test_revision')::uuid then raise exception 'Revision trigger failed'; end if;
  begin
    insert into public.reset_progress(user_id,goal_category,start_date) values (current_setting('reset.test_b')::uuid,'wellbeing',current_date);
    raise exception 'Cross-user INSERT was allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.reset_progress set user_id=current_setting('reset.test_b')::uuid where user_id=auth.uid();
    raise exception 'Ownership change was allowed';
  exception when insufficient_privilege then null; end;
  begin
    update reset_private.sync_verification set verified_at=now();
    raise exception 'Client could modify security gate';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('reset.test_b'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('reset.test_b'),'role','authenticated')::text,true);
do $$
declare n integer;
begin
  if exists(select 1 from public.reset_progress) then raise exception 'Cross-user SELECT leaked data'; end if;
  update public.reset_progress set goal_category='reduce' where user_id=current_setting('reset.test_a')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Cross-user UPDATE allowed'; end if;
  delete from public.reset_progress where user_id=current_setting('reset.test_a')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Cross-user DELETE allowed'; end if;
end $$;
insert into public.reset_progress(user_id,goal_category,start_date) values (auth.uid(),'break',current_date);
do $$
declare n integer;
begin
  if (select count(*) from public.reset_progress) <> 1 then raise exception 'B owner read failed'; end if;
  delete from public.reset_progress where user_id=auth.uid();
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Owner DELETE failed'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
do $$
begin
  begin
    perform * from public.reset_progress;
    raise exception 'Anonymous SELECT allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.reset_progress(user_id,goal_category,start_date) values (current_setting('reset.test_b')::uuid,'wellbeing',current_date);
    raise exception 'Anonymous INSERT allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Check that the server gate really blocks writes before verification.
update reset_private.sync_verification set verified_at=null;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('reset.test_b'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('reset.test_b'),'role','authenticated')::text,true);
do $$
begin
  if public.reset_sync_ready() then raise exception 'Unverified gate incorrectly open'; end if;
  begin
    insert into public.reset_progress(user_id,goal_category,start_date) values (auth.uid(),'wellbeing',current_date);
    raise exception 'Upload allowed without verification';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback to savepoint before_test_data;
-- No test progress is retained. Only the successful verification is committed.
update reset_private.sync_verification set policy_signature=reset_private.policy_signature(), verified_at=now();
commit;
select public.reset_sync_ready() as sync_verified; -- Must be true.
