-- Account deletion for TUR (required by App Store guideline 5.1.1(v) and
-- Google Play's account/data-deletion policy).
--
-- Run this ONCE in the Supabase SQL Editor:
-- Dashboard → SQL Editor → New query → paste → Run

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Remove the user's data
  delete from public.check_ins where runner_id = uid::text;
  delete from public.runners where id = uid::text;

  -- Remove the auth account itself
  delete from auth.users where id = uid;
end;
$$;

-- Only signed-in users may call it
revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
