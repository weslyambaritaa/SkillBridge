-- Phase 1 account and authorization foundation.
-- Role assignment is intentionally not available through table writes.

create type public.user_role as enum ('STUDENT', 'BUSINESS', 'ADMIN');

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  deleted_at timestamptz,
  purge_eligible_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((deleted_at is null and purge_eligible_at is null) or (deleted_at is not null and purge_eligible_at >= deleted_at + interval '30 days'))
);

create table public.user_roles (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default now()
);

create index user_roles_role_idx on public.user_roles (role);

create function public.current_account_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.id
  from public.accounts as a
  where a.auth_user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_account_id() from public;
grant execute on function public.current_account_id() to authenticated;

alter table public.accounts enable row level security;
alter table public.user_roles enable row level security;

create policy "accounts_select_own"
  on public.accounts for select to authenticated
  using ((select auth.uid()) = auth_user_id);

create policy "user_roles_select_own"
  on public.user_roles for select to authenticated
  using ((select public.current_account_id()) = account_id);

revoke all on table public.accounts from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;
grant select on table public.accounts to authenticated;
grant select on table public.user_roles to authenticated;

create function public.bootstrap_account(p_requested_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_account uuid;
  requested_role public.user_role;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_requested_role not in ('STUDENT', 'BUSINESS') then
    raise exception 'Only STUDENT and BUSINESS roles may self-register';
  end if;

  requested_role := p_requested_role::public.user_role;

  insert into public.accounts (auth_user_id)
  values (current_user_id)
  on conflict (auth_user_id) do nothing
  returning id into current_account;

  if current_account is null then
    select a.id into current_account
    from public.accounts as a
    where a.auth_user_id = current_user_id;
  end if;

  insert into public.user_roles (account_id, role)
  values (current_account, requested_role)
  on conflict (account_id) do nothing;
end;
$$;

revoke all on function public.bootstrap_account(text) from public;
grant execute on function public.bootstrap_account(text) to authenticated;
