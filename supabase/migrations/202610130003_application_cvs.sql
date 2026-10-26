-- Private CVs for project applications. Apply after 202610130002.
-- Existing applications remain readable; every new application must include a PDF CV.

alter table public.project_applications
  add column cv_storage_path text unique,
  add column cv_original_filename text check (cv_original_filename is null or length(btrim(cv_original_filename)) between 1 and 180),
  add column cv_mime_type text check (cv_mime_type is null or cv_mime_type = 'application/pdf'),
  add column cv_size_bytes integer check (cv_size_bytes is null or cv_size_bytes between 1 and 5242880),
  add constraint project_applications_cv_complete check (
    (cv_storage_path is null and cv_original_filename is null and cv_mime_type is null and cv_size_bytes is null)
    or (cv_storage_path is not null and cv_original_filename is not null and cv_mime_type = 'application/pdf' and cv_size_bytes is not null)
  );

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('application-cvs', 'application-cvs', false, 5242880, array['application/pdf'])
on conflict(id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['application/pdf'];

create function private.can_read_application_cv(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.project_applications pa
    join public.student_profiles s on s.id = pa.student_id
    join public.accounts student_account on student_account.id = s.account_id
    join public.projects p on p.id = pa.project_id
    join public.business_profiles b on b.id = p.business_id
    join public.accounts business_account on business_account.id = b.account_id
    where pa.cv_storage_path = p_path and (
      (student_account.auth_user_id = auth.uid() and student_account.deleted_at is null)
      or (business_account.auth_user_id = auth.uid() and business_account.deleted_at is null)
    )
  );
$$;

create function private.can_remove_unattached_cv(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and split_part(p_path, '/', 1) = auth.uid()::text
    and not exists (select 1 from public.project_applications pa where pa.cv_storage_path = p_path);
$$;

revoke all on function private.can_read_application_cv(text), private.can_remove_unattached_cv(text) from public;
grant execute on function private.can_read_application_cv(text), private.can_remove_unattached_cv(text) to authenticated;

create policy application_cv_owner_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'application-cvs'
  and split_part(name, '/', 1) = auth.uid()::text
  and name ~ '^[a-f0-9-]{36}/applications/[a-f0-9-]{36}[.]pdf$'
);
create policy application_cv_participants_read on storage.objects for select to authenticated using (
  bucket_id = 'application-cvs' and (
    split_part(name, '/', 1) = auth.uid()::text or private.can_read_application_cv(name)
  )
);
create policy application_cv_unattached_cleanup on storage.objects for delete to authenticated using (
  bucket_id = 'application-cvs' and private.can_remove_unattached_cv(name)
);

create function public.apply_to_project_with_cv(
  p_project_role_id uuid, p_message text, p_cv_path text,
  p_cv_filename text, p_cv_mime text, p_cv_size integer
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare application_uuid uuid;
begin
  if auth.uid() is null or p_cv_path is null
    or split_part(p_cv_path, '/', 1) <> auth.uid()::text
    or p_cv_path !~ '^[a-f0-9-]{36}/applications/[a-f0-9-]{36}[.]pdf$'
    or length(btrim(coalesce(p_cv_filename, ''))) not between 1 and 180
    or p_cv_mime is distinct from 'application/pdf'
    or p_cv_size is null or p_cv_size not between 1 and 5242880
    or not exists (select 1 from storage.objects o where o.bucket_id = 'application-cvs' and o.name = p_cv_path)
  then raise exception 'Valid PDF CV required'; end if;
  application_uuid := public.apply_to_project(p_project_role_id, p_message);
  update public.project_applications set
    cv_storage_path = p_cv_path, cv_original_filename = btrim(p_cv_filename),
    cv_mime_type = p_cv_mime, cv_size_bytes = p_cv_size
    where id = application_uuid;
  return application_uuid;
end;
$$;

-- The old entry point would allow an application without a CV.
revoke execute on function public.apply_to_project(uuid, text) from authenticated;
revoke all on function public.apply_to_project_with_cv(uuid, text, text, text, text, integer) from public;
grant execute on function public.apply_to_project_with_cv(uuid, text, text, text, text, integer) to authenticated;

-- Return only the CV filename to the business page; the path stays server-side.
drop function public.business_list_project_applications(uuid);
create function public.business_list_project_applications(p_project_id uuid)
returns table(application_id uuid, role_title text, student_name text, student_bio text,
  application_message text, application_status public.project_application_status,
  applied_at timestamptz, decided_at timestamptz, completed_at timestamptz, cv_original_filename text)
language sql stable security definer set search_path = '' as $$
  select pa.id, r.title, s.display_name, s.bio, pa.message, pa.status,
    pa.applied_at, pa.decided_at, pa.completed_at, pa.cv_original_filename
  from public.project_applications pa
  join public.project_roles r on r.id = pa.project_role_id
  join public.student_profiles s on s.id = pa.student_id
  join public.projects p on p.id = pa.project_id
  join public.business_profiles b on b.id = p.business_id
  join public.accounts a on a.id = b.account_id
  where pa.project_id = p_project_id and a.auth_user_id = auth.uid() and a.deleted_at is null
  order by pa.applied_at desc;
$$;

create function public.business_application_cv(p_application_id uuid)
returns table(storage_path text, original_filename text)
language sql stable security definer set search_path = '' as $$
  select pa.cv_storage_path, pa.cv_original_filename
  from public.project_applications pa
  join public.projects p on p.id = pa.project_id
  join public.business_profiles b on b.id = p.business_id
  join public.accounts a on a.id = b.account_id
  join public.user_roles ur on ur.account_id = a.id and ur.role = 'BUSINESS'
  where pa.id = p_application_id and pa.cv_storage_path is not null
    and a.auth_user_id = auth.uid() and a.deleted_at is null;
$$;

drop function public.student_list_applications();
create function public.student_list_applications()
returns table(application_id uuid, project_title text, role_title text, business_name text,
  application_status public.project_application_status, applied_at timestamptz, decided_at timestamptz,
  completed_at timestamptz, cv_original_filename text)
language sql stable security definer set search_path = '' as $$
  select pa.id, p.title, r.title, b.business_name, pa.status,
    pa.applied_at, pa.decided_at, pa.completed_at, pa.cv_original_filename
  from public.project_applications pa
  join public.student_profiles s on s.id = pa.student_id
  join public.accounts a on a.id = s.account_id
  join public.projects p on p.id = pa.project_id
  join public.project_roles r on r.id = pa.project_role_id
  join public.business_profiles b on b.id = p.business_id
  where a.auth_user_id = auth.uid() and a.deleted_at is null
  order by pa.applied_at desc;
$$;

create function public.student_attach_application_cv(
  p_application_id uuid, p_cv_path text, p_cv_filename text, p_cv_mime text, p_cv_size integer
)
returns void language plpgsql security definer set search_path = '' as $$
declare student_uuid uuid;
begin
  if auth.uid() is null or p_cv_path is null
    or split_part(p_cv_path, '/', 1) <> auth.uid()::text
    or p_cv_path !~ '^[a-f0-9-]{36}/applications/[a-f0-9-]{36}[.]pdf$'
    or length(btrim(coalesce(p_cv_filename, ''))) not between 1 and 180
    or p_cv_mime is distinct from 'application/pdf'
    or p_cv_size is null or p_cv_size not between 1 and 5242880
    or not exists (select 1 from storage.objects o where o.bucket_id = 'application-cvs' and o.name = p_cv_path)
  then raise exception 'Valid PDF CV required'; end if;
  select pa.student_id into student_uuid from public.project_applications pa
    join public.student_profiles s on s.id = pa.student_id
    join public.accounts a on a.id = s.account_id
    where pa.id = p_application_id and a.auth_user_id = auth.uid() and a.deleted_at is null
      and pa.status in ('PENDING', 'ACCEPTED') and pa.cv_storage_path is null for update of pa;
  if student_uuid is null then raise exception 'Open own application without CV required'; end if;
  update public.project_applications set
    cv_storage_path = p_cv_path, cv_original_filename = btrim(p_cv_filename),
    cv_mime_type = p_cv_mime, cv_size_bytes = p_cv_size
    where id = p_application_id;
end;
$$;

revoke all on function public.business_list_project_applications(uuid), public.business_application_cv(uuid),
  public.student_list_applications(), public.student_attach_application_cv(uuid, text, text, text, integer) from public;
grant execute on function public.business_list_project_applications(uuid), public.business_application_cv(uuid),
  public.student_list_applications(), public.student_attach_application_cv(uuid, text, text, text, integer) to authenticated;

notify pgrst, 'reload schema';
