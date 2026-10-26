-- Return private onboarding fields only to the authenticated student owner.
-- Keep direct table access and public profiles unchanged.
create function public.student_own_private_onboarding()
returns table(identity_value text, date_of_birth date)
language sql stable security definer set search_path = '' as $$
  select ai.identity_value, d.date_of_birth
  from public.student_profiles s
  join public.accounts a on a.id = s.account_id
  join public.user_roles r on r.account_id = a.id and r.role = 'STUDENT'
  join public.academic_identities ai on ai.student_id = s.id
  join public.student_private_data d on d.student_id = s.id
  where a.auth_user_id = auth.uid() and a.deleted_at is null;
$$;

revoke all on function public.student_own_private_onboarding() from public, anon;
grant execute on function public.student_own_private_onboarding() to authenticated;
