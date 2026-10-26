-- Applications, business decisions, and project completion.
-- Apply after Phase 1-3. All writes go through authenticated, owner-checked RPCs.

create type public.project_application_status as enum ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CLOSED');
create type public.project_execution_status as enum ('ACTIVE', 'COMPLETED');

create table public.project_applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  project_role_id uuid not null,
  student_id uuid not null references public.student_profiles(id) on delete restrict,
  message text not null check (length(btrim(message)) between 20 and 1000),
  status public.project_application_status not null default 'PENDING',
  applied_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by_account_id uuid references public.accounts(id) on delete set null,
  completed_at timestamptz,
  unique(project_id, student_id),
  foreign key(project_role_id, project_id) references public.project_roles(id, project_id) on delete restrict,
  check ((status = 'PENDING' and decided_at is null and completed_at is null)
    or (status in ('ACCEPTED', 'REJECTED', 'CLOSED') and decided_at is not null and completed_at is null)
    or (status = 'COMPLETED' and decided_at is not null and completed_at is not null))
);
create index project_applications_business_queue_idx on public.project_applications(project_id, status, applied_at);
create index project_applications_student_idx on public.project_applications(student_id, applied_at desc);
create unique index project_applications_one_active_student_idx on public.project_applications(student_id) where status = 'ACCEPTED';

create table public.project_executions (
  project_id uuid primary key references public.projects(id) on delete restrict,
  status public.project_execution_status not null default 'ACTIVE',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by_account_id uuid references public.accounts(id) on delete set null,
  check ((status = 'ACTIVE' and completed_at is null) or (status = 'COMPLETED' and completed_at is not null))
);

alter table public.project_applications enable row level security;
alter table public.project_executions enable row level security;
revoke all on public.project_applications, public.project_executions from anon, authenticated;

-- A running or completed project cannot be edited/cancelled using Phase 3 RPCs.
-- Completion may only hide the public listing while the execution is ACTIVE.
create function public.protect_project_during_execution()
returns trigger language plpgsql set search_path = '' as $$
declare execution_status public.project_execution_status;
begin
  select e.status into execution_status from public.project_executions e where e.project_id = old.id;
  if execution_status = 'COMPLETED' then
    raise exception 'Completed project cannot be changed';
  end if;
  if execution_status = 'ACTIVE' and not (
    old.visibility = 'PUBLIC' and new.visibility = 'PRIVATE'
    and (to_jsonb(new) - 'visibility' - 'updated_at') = (to_jsonb(old) - 'visibility' - 'updated_at')
  ) then
    raise exception 'Active project cannot be edited or cancelled';
  end if;
  if execution_status is null and exists (
    select 1 from public.project_applications pa where pa.project_id = old.id
  ) then
    raise exception 'Project with applications cannot be edited or cancelled';
  end if;
  return new;
end;
$$;
create trigger projects_execution_guard before update on public.projects
  for each row execute function public.protect_project_during_execution();
revoke all on function public.protect_project_during_execution() from public;

create function public.apply_to_project(p_project_role_id uuid, p_message text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare project_row public.projects%rowtype; student_uuid uuid; application_uuid uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.accounts a join public.user_roles ur on ur.account_id = a.id
    where a.auth_user_id = auth.uid() and a.deleted_at is null and ur.role = 'STUDENT'
  ) then raise exception 'Student role required'; end if;
  if length(btrim(coalesce(p_message, ''))) not between 20 and 1000 then raise exception 'Application message must be 20-1000 characters'; end if;
  select p.* into project_row from public.project_roles r join public.projects p on p.id = r.project_id
    where r.id = p_project_role_id for update of p;
  if project_row.id is null or project_row.moderation_status <> 'APPROVED'
    or project_row.visibility <> 'PUBLIC' or project_row.published_at is null
    or project_row.lifecycle_status <> 'NOT_STARTED'
    or exists (select 1 from public.project_executions e where e.project_id = project_row.id and e.status = 'COMPLETED')
    or not exists (select 1 from public.business_verifications bv where bv.business_id = project_row.business_id and bv.status = 'VERIFIED')
  then raise exception 'Project is not open for applications'; end if;
  select s.id into student_uuid from public.student_profiles s join public.accounts a on a.id = s.account_id
    where a.auth_user_id = auth.uid() and a.deleted_at is null for update of s;
  if student_uuid is null or not public.student_is_eligible_for_apply(student_uuid) then raise exception 'Student verification or guardian consent required'; end if;
  if exists (select 1 from public.project_applications pa where pa.student_id = student_uuid and pa.status = 'ACCEPTED') then
    raise exception 'Student is already on a project';
  end if;
  if exists (select 1 from public.project_applications pa where pa.project_id = project_row.id and pa.student_id = student_uuid) then
    raise exception 'Student has already applied to this project';
  end if;
  insert into public.project_applications(project_id, project_role_id, student_id, message)
    values(project_row.id, p_project_role_id, student_uuid, btrim(p_message)) returning id into application_uuid;
  return application_uuid;
end;
$$;

create function public.student_list_applications()
returns table(application_id uuid, project_title text, role_title text, business_name text,
  application_status public.project_application_status, applied_at timestamptz, decided_at timestamptz, completed_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select pa.id, p.title, r.title, b.business_name, pa.status, pa.applied_at, pa.decided_at, pa.completed_at
  from public.project_applications pa
  join public.student_profiles s on s.id = pa.student_id
  join public.accounts a on a.id = s.account_id
  join public.projects p on p.id = pa.project_id
  join public.project_roles r on r.id = pa.project_role_id
  join public.business_profiles b on b.id = p.business_id
  where a.auth_user_id = auth.uid() and a.deleted_at is null
  order by pa.applied_at desc;
$$;

create function public.business_list_project_applications(p_project_id uuid)
returns table(application_id uuid, role_title text, student_name text, student_bio text,
  application_message text, application_status public.project_application_status,
  applied_at timestamptz, decided_at timestamptz, completed_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select pa.id, r.title, s.display_name, s.bio, pa.message, pa.status, pa.applied_at, pa.decided_at, pa.completed_at
  from public.project_applications pa
  join public.project_roles r on r.id = pa.project_role_id
  join public.student_profiles s on s.id = pa.student_id
  join public.projects p on p.id = pa.project_id
  join public.business_profiles b on b.id = p.business_id
  join public.accounts a on a.id = b.account_id
  where pa.project_id = p_project_id and a.auth_user_id = auth.uid() and a.deleted_at is null
  order by pa.applied_at desc;
$$;

create function public.business_project_execution(p_project_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select e.status::text from public.project_executions e where e.project_id = p.id), 'OPEN')
  from public.projects p join public.business_profiles b on b.id = p.business_id
  join public.accounts a on a.id = b.account_id
  where p.id = p_project_id and a.auth_user_id = auth.uid() and a.deleted_at is null;
$$;

create function public.business_decide_application(p_application_id uuid, p_decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare project_uuid uuid; project_row public.projects%rowtype; applicant public.project_applications%rowtype;
  role_slots integer; accepted_slots integer;
begin
  if p_decision is null or p_decision not in ('ACCEPTED', 'REJECTED') then raise exception 'Invalid application decision'; end if;
  select pa.project_id into project_uuid from public.project_applications pa where pa.id = p_application_id;
  if project_uuid is null then raise exception 'Application not found'; end if;
  select p.* into project_row from public.projects p where p.id = project_uuid for update;
  if not exists (
    select 1 from public.business_profiles b join public.accounts a on a.id = b.account_id
    join public.user_roles ur on ur.account_id = a.id
    where b.id = project_row.business_id and a.auth_user_id = auth.uid() and a.deleted_at is null and ur.role = 'BUSINESS'
  ) then raise exception 'Business owner required'; end if;
  if project_row.moderation_status <> 'APPROVED' or project_row.visibility <> 'PUBLIC'
    or project_row.published_at is null or project_row.lifecycle_status <> 'NOT_STARTED'
    or exists (select 1 from public.project_executions e where e.project_id = project_uuid and e.status = 'COMPLETED')
  then raise exception 'Project is closed'; end if;
  select pa.* into applicant from public.project_applications pa where pa.id = p_application_id and pa.project_id = project_uuid;
  if applicant.id is null then raise exception 'Application not found'; end if;
  perform 1 from public.student_profiles s where s.id = applicant.student_id for update;
  select pa.* into applicant from public.project_applications pa where pa.id = p_application_id and pa.status = 'PENDING' for update;
  if applicant.id is null then raise exception 'Application is no longer pending'; end if;
  if p_decision = 'ACCEPTED' then
    if not exists (select 1 from public.business_verifications bv where bv.business_id = project_row.business_id and bv.status = 'VERIFIED') then
      raise exception 'Business verification required'; end if;
    if not exists (
      select 1 from public.student_profiles s join public.accounts a on a.id = s.account_id
      where s.id = applicant.student_id and a.deleted_at is null
    ) then raise exception 'Student is no longer eligible'; end if;
    if exists (select 1 from public.project_applications pa where pa.student_id = applicant.student_id and pa.status = 'ACCEPTED') then
      raise exception 'Student is already on a project'; end if;
    if not exists (select 1 from public.student_verifications v where v.student_id = applicant.student_id and v.status = 'VERIFIED')
      or not exists (
        select 1 from public.student_private_data d where d.student_id = applicant.student_id
        and ((d.date_of_birth + interval '18 years')::date <= current_date
          or exists (select 1 from public.guardian_consents c where c.student_id = applicant.student_id and c.status = 'CONSENTED'))
      ) then raise exception 'Student is no longer eligible'; end if;
    select r.slot_count into role_slots from public.project_roles r where r.id = applicant.project_role_id;
    select count(*) into accepted_slots from public.project_applications pa
      where pa.project_role_id = applicant.project_role_id and pa.status = 'ACCEPTED';
    if accepted_slots >= role_slots then raise exception 'Role is full'; end if;
    update public.project_applications set status = 'ACCEPTED', decided_at = now(), decided_by_account_id = public.current_account_id()
      where id = applicant.id;
    insert into public.project_executions(project_id, status) values(project_uuid, 'ACTIVE') on conflict(project_id) do nothing;
  else
    update public.project_applications set status = 'REJECTED', decided_at = now(), decided_by_account_id = public.current_account_id()
      where id = applicant.id;
  end if;
end;
$$;

create function public.business_complete_project(p_project_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare project_row public.projects%rowtype;
begin
  select p.* into project_row from public.projects p where p.id = p_project_id for update;
  if project_row.id is null or not exists (
    select 1 from public.business_profiles b join public.accounts a on a.id = b.account_id
    join public.user_roles ur on ur.account_id = a.id
    where b.id = project_row.business_id and a.auth_user_id = auth.uid() and a.deleted_at is null and ur.role = 'BUSINESS'
  ) then raise exception 'Business owner required'; end if;
  if not exists (select 1 from public.project_executions e where e.project_id = p_project_id and e.status = 'ACTIVE')
    or not exists (select 1 from public.project_applications pa where pa.project_id = p_project_id and pa.status = 'ACCEPTED')
  then raise exception 'Project has no active accepted student'; end if;
  update public.projects set visibility = 'PRIVATE', updated_at = now() where id = p_project_id;
  update public.project_applications set status = 'COMPLETED', completed_at = now()
    where project_id = p_project_id and status = 'ACCEPTED';
  update public.project_applications set status = 'CLOSED', decided_at = now(), decided_by_account_id = public.current_account_id()
    where project_id = p_project_id and status = 'PENDING';
  update public.project_executions set status = 'COMPLETED', completed_at = now(), completed_by_account_id = public.current_account_id()
    where project_id = p_project_id and status = 'ACTIVE';
end;
$$;

-- Add public role UUIDs to the existing safe marketplace DTO so a student can apply
-- to an exact role. No account, business, identity, or private application IDs leak.
create or replace function public.project_marketplace(p_q text default null,p_category text default null,p_difficulty text default null,p_payment text default null,p_skill text default null,p_slug text default null,p_limit integer default 24,p_offset integer default 0)
returns table(project_slug text,title text,problem_statement text,objective text,scope text,expected_deliverables text,category_name text,category_slug text,difficulty public.project_difficulty,payment_type public.project_payment_type,proposed_compensation_amount numeric,estimated_duration_days integer,published_at timestamptz,business_name text,business_description text,business_verified boolean,roles jsonb)
language plpgsql stable security definer set search_path='' as $$
begin
 if p_limit is null or p_offset is null or p_limit not between 1 and 50 or p_offset<0 or length(coalesce(p_q,''))>120 then raise exception 'Invalid marketplace query'; end if;
 return query
 select p.public_slug,p.title,p.problem_statement,p.objective,p.scope,p.expected_deliverables,c.name,c.slug,p.difficulty,p.payment_type,p.proposed_compensation_amount,p.estimated_duration_days,p.published_at,b.business_name,left(coalesce(b.description,''),500),true,
  coalesce((select jsonb_agg(jsonb_build_object(
    'id',r.id,'title',r.title,'description',r.description,'slotCount',r.slot_count,
    'requiredSkills',coalesce((select jsonb_agg(s.name order by s.name) from public.project_role_skills prs join public.skills s on s.id=prs.skill_id where prs.project_role_id=r.id and prs.requirement_type='REQUIRED'),'[]'::jsonb),
    'preferredSkills',coalesce((select jsonb_agg(s.name order by s.name) from public.project_role_skills prs join public.skills s on s.id=prs.skill_id where prs.project_role_id=r.id and prs.requirement_type='PREFERRED'),'[]'::jsonb)
  ) order by r.created_at,r.id) from public.project_roles r where r.project_id=p.id),'[]'::jsonb)
 from public.projects p join public.project_categories c on c.id=p.category_id
 join public.business_profiles b on b.id=p.business_id join public.business_verifications bv on bv.business_id=b.id
 where p.moderation_status='APPROVED' and p.visibility='PUBLIC' and p.published_at is not null and p.lifecycle_status='NOT_STARTED' and bv.status='VERIFIED'
   and (p_slug is null or p.public_slug=p_slug)
   and (nullif(btrim(p_category),'') is null or c.slug=p_category)
   and (nullif(btrim(p_difficulty),'') is null or p.difficulty::text=p_difficulty)
   and (nullif(btrim(p_payment),'') is null or p.payment_type::text=p_payment)
   and (nullif(btrim(p_skill),'') is null or exists(select 1 from public.project_roles sr join public.project_role_skills ss on ss.project_role_id=sr.id join public.skills sk on sk.id=ss.skill_id where sr.project_id=p.id and sk.slug=p_skill and sk.is_active))
   and (nullif(btrim(p_q),'') is null or p.title ilike '%'||btrim(p_q)||'%' or p.problem_statement ilike '%'||btrim(p_q)||'%')
 order by p.published_at desc,p.id
 limit p_limit offset p_offset;
end; $$;

revoke all on function public.apply_to_project(uuid,text), public.student_list_applications(),
  public.business_list_project_applications(uuid), public.business_project_execution(uuid),
  public.business_decide_application(uuid,text), public.business_complete_project(uuid) from public;
grant execute on function public.apply_to_project(uuid,text), public.student_list_applications(),
  public.business_list_project_applications(uuid), public.business_project_execution(uuid),
  public.business_decide_application(uuid,text), public.business_complete_project(uuid) to authenticated;

notify pgrst, 'reload schema';
