-- Phase 3: projects, role/skill taxonomy, moderation, and safe public marketplace.
-- This migration intentionally creates no application, agreement, member,
-- milestone, payment transaction, competency, passport, report, or AI domain.

create type public.project_moderation_status as enum (
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED'
);
create type public.project_lifecycle_status as enum ('NOT_STARTED', 'CANCELLED');
create type public.project_visibility as enum ('PRIVATE', 'PUBLIC');
create type public.project_difficulty as enum ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
create type public.project_payment_type as enum ('PAID', 'UNPAID');
create type public.project_skill_requirement as enum ('REQUIRED', 'PREFERRED');
create type public.project_review_decision as enum ('APPROVED', 'REQUEST_REVISION', 'REJECTED');

create table public.project_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 100),
  normalized_name text not null unique check (normalized_name=regexp_replace(lower(normalize(btrim(name),NFKC)),'[[:space:]]+',' ','g')),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 100),
  normalized_name text not null unique check (normalized_name=regexp_replace(lower(normalize(btrim(name),NFKC)),'[[:space:]]+',' ','g')),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text check (category is null or length(category) <= 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.project_categories(name,normalized_name,slug) values
 ('Web Development','web development','web-development'),
 ('Mobile Development','mobile development','mobile-development'),
 ('UI/UX Design','ui/ux design','ui-ux-design'),
 ('Data Analytics','data analytics','data-analytics'),
 ('AI & Machine Learning','ai & machine learning','ai-machine-learning'),
 ('Cybersecurity','cybersecurity','cybersecurity'),
 ('Business Automation','business automation','business-automation'),
 ('Cloud & DevOps','cloud & devops','cloud-devops'),
 ('Digital Marketing Analytics','digital marketing analytics','digital-marketing-analytics'),
 ('Information Systems','information systems','information-systems'),
 ('Other Digital Solution','other digital solution','other-digital-solution');

insert into public.skills(name,normalized_name,slug,category) values
 ('HTML','html','html','Frontend'),('CSS','css','css','Frontend'),
 ('JavaScript','javascript','javascript','Frontend'),('TypeScript','typescript','typescript','Frontend'),
 ('React','react','react','Frontend'),('Next.js','next.js','next-js','Frontend'),
 ('Node.js','node.js','node-js','Backend'),('Express.js','express.js','express-js','Backend'),
 ('PHP','php','php','Backend'),('Laravel','laravel','laravel','Backend'),
 ('Python','python','python','Backend'),('Django','django','django','Backend'),
 ('FastAPI','fastapi','fastapi','Backend'),('REST API','rest api','rest-api','Backend'),
 ('PostgreSQL','postgresql','postgresql','Database'),('MySQL','mysql','mysql','Database'),
 ('Supabase','supabase','supabase','Database'),('Firebase','firebase','firebase','Database'),
 ('React Native','react native','react-native','Mobile'),('Flutter','flutter','flutter','Mobile'),
 ('Figma','figma','figma','UI/UX'),('UI Design','ui design','ui-design','UI/UX'),
 ('UX Research','ux research','ux-research','UI/UX'),('Data Analysis','data analysis','data-analysis','Data'),
 ('Power BI','power bi','power-bi','Data'),('Machine Learning','machine learning','machine-learning','AI/ML'),
 ('Artificial Intelligence','artificial intelligence','artificial-intelligence','AI/ML'),
 ('Cybersecurity','cybersecurity','cybersecurity','Security'),('Git','git','git','Tools'),
 ('Docker','docker','docker','Cloud/DevOps'),('Cloud','cloud','cloud','Cloud/DevOps'),
 ('DevOps','devops','devops','Cloud/DevOps'),('Digital Analytics','digital analytics','digital-analytics','Marketing');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete restrict,
  public_slug text not null unique check (public_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 5 and 120),
  problem_statement text not null check (length(btrim(problem_statement)) between 30 and 4000),
  objective text not null check (length(btrim(objective)) between 20 and 2400),
  scope text not null check (length(btrim(scope)) between 20 and 6000),
  expected_deliverables text not null check (length(btrim(expected_deliverables)) between 20 and 4000),
  category_id uuid not null references public.project_categories(id) on delete restrict,
  difficulty public.project_difficulty not null,
  payment_type public.project_payment_type not null,
  proposed_compensation_amount numeric(14,2) check (proposed_compensation_amount is null or proposed_compensation_amount > 0),
  estimated_duration_days integer check (estimated_duration_days is null or estimated_duration_days between 1 and 365),
  moderation_status public.project_moderation_status not null default 'DRAFT',
  lifecycle_status public.project_lifecycle_status not null default 'NOT_STARTED',
  visibility public.project_visibility not null default 'PRIVATE',
  published_at timestamptz,
  current_review_attempt_id uuid,
  cancelled_at timestamptz,
  cancelled_by_account_id uuid references public.accounts(id) on delete set null,
  cancellation_reason text check (cancellation_reason is null or length(cancellation_reason) <= 1200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (payment_type = 'PAID' or proposed_compensation_amount is null),
  check ((visibility = 'PUBLIC' and moderation_status = 'APPROVED' and published_at is not null and lifecycle_status <> 'CANCELLED') or visibility = 'PRIVATE'),
  check ((lifecycle_status = 'NOT_STARTED' and cancelled_at is null) or (lifecycle_status = 'CANCELLED' and cancelled_at is not null)),
  unique (id,business_id)
);
create index projects_business_updated_idx on public.projects(business_id,updated_at desc);
create index projects_moderation_lifecycle_idx on public.projects(moderation_status,lifecycle_status);
create index projects_category_idx on public.projects(category_id);
create index projects_difficulty_idx on public.projects(difficulty);
create index projects_payment_idx on public.projects(payment_type);
create index projects_published_newest_idx on public.projects(published_at desc)
  where moderation_status='APPROVED' and lifecycle_status='NOT_STARTED' and visibility='PUBLIC';

create table public.project_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  title text not null check (length(btrim(title)) between 2 and 100),
  description text not null check (length(btrim(description)) between 10 and 1600),
  slot_count integer not null check (slot_count > 0 and slot_count <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,project_id)
);
create index project_roles_project_idx on public.project_roles(project_id,created_at);

create table public.project_role_skills (
  project_role_id uuid not null references public.project_roles(id) on delete restrict,
  skill_id uuid not null references public.skills(id) on delete restrict,
  requirement_type public.project_skill_requirement not null,
  created_at timestamptz not null default now(),
  primary key(project_role_id,skill_id)
);
create index project_role_skills_skill_idx on public.project_role_skills(skill_id,project_role_id);

create table public.project_moderation_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  attempt_number integer not null check (attempt_number > 0),
  submitted_at timestamptz not null default now(),
  review_started_at timestamptz,
  reviewed_at timestamptz,
  reviewer_account_id uuid references public.accounts(id) on delete set null,
  decision public.project_review_decision,
  reason text check (reason is null or length(reason) <= 1600),
  created_at timestamptz not null default now(),
  unique(project_id,attempt_number),
  unique(id,project_id),
  check ((decision is null and reviewed_at is null) or (decision is not null and reviewed_at is not null)),
  check (decision not in ('REQUEST_REVISION','REJECTED') or length(btrim(coalesce(reason,''))) >= 3)
);
create index project_reviews_project_idx on public.project_moderation_reviews(project_id,attempt_number desc);
create index project_reviews_queue_idx on public.project_moderation_reviews(submitted_at) where decision is null;
alter table public.projects add constraint projects_current_review_fk
  foreign key(current_review_attempt_id,id) references public.project_moderation_reviews(id,project_id) on delete restrict;

alter table public.project_categories enable row level security;
alter table public.skills enable row level security;
alter table public.projects enable row level security;
alter table public.project_roles enable row level security;
alter table public.project_role_skills enable row level security;
alter table public.project_moderation_reviews enable row level security;

create policy categories_active_public_read on public.project_categories for select to anon,authenticated using (is_active);
create policy categories_admin_read_all on public.project_categories for select to authenticated using ((select public.is_admin()));
create policy categories_admin_insert on public.project_categories for insert to authenticated with check ((select public.is_admin()));
create policy categories_admin_update on public.project_categories for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy skills_active_public_read on public.skills for select to anon,authenticated using (is_active);
create policy skills_admin_read_all on public.skills for select to authenticated using ((select public.is_admin()));
create policy skills_admin_insert on public.skills for insert to authenticated with check ((select public.is_admin()));
create policy skills_admin_update on public.skills for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon,authenticated;

create function private.is_business_verified_for_marketplace(p_business_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.business_verifications bv where bv.business_id=p_business_id and bv.status='VERIFIED');
$$;
revoke all on function private.is_business_verified_for_marketplace(uuid) from public;
grant execute on function private.is_business_verified_for_marketplace(uuid) to anon,authenticated;

create function private.is_project_public(p_project_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.projects p where p.id=p_project_id and p.moderation_status='APPROVED' and p.visibility='PUBLIC' and p.published_at is not null and p.lifecycle_status='NOT_STARTED' and private.is_business_verified_for_marketplace(p.business_id));
$$;
create function private.can_read_private_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select public.is_admin() or exists(select 1 from public.projects p where p.id=p_project_id and p.business_id=public.current_business_id());
$$;
create function private.can_read_project_role(p_role_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.project_roles r where r.id=p_role_id and (private.can_read_private_project(r.project_id) or private.is_project_public(r.project_id)));
$$;
revoke all on function private.is_project_public(uuid),private.can_read_private_project(uuid),private.can_read_project_role(uuid) from public;
grant execute on function private.is_project_public(uuid) to anon,authenticated;
grant execute on function private.can_read_private_project(uuid) to authenticated;
grant execute on function private.can_read_project_role(uuid) to anon,authenticated;

create policy project_owner_admin_read on public.projects for select to authenticated
  using (business_id=(select public.current_business_id()) or (select public.is_admin()) or
    (moderation_status='APPROVED' and visibility='PUBLIC' and published_at is not null and lifecycle_status='NOT_STARTED'
      and private.is_business_verified_for_marketplace(projects.business_id)));
create policy project_anonymous_published_read on public.projects for select to anon
  using (moderation_status='APPROVED' and visibility='PUBLIC' and published_at is not null and lifecycle_status='NOT_STARTED'
    and private.is_business_verified_for_marketplace(projects.business_id));
create policy project_roles_owner_admin_read on public.project_roles for select to authenticated using (
  private.can_read_private_project(project_id) or private.is_project_public(project_id));
create policy project_roles_public_read on public.project_roles for select to anon using (private.is_project_public(project_id));
create policy role_skills_owner_admin_read on public.project_role_skills for select to authenticated using (
  private.can_read_project_role(project_role_id));
create policy role_skills_public_read on public.project_role_skills for select to anon using (private.can_read_project_role(project_role_id));
create policy moderation_owner_admin_read on public.project_moderation_reviews for select to authenticated using (
  private.can_read_private_project(project_id));

revoke all on public.project_categories,public.skills,public.projects,public.project_roles,public.project_role_skills,public.project_moderation_reviews from anon,authenticated;
grant select on public.project_categories,public.skills to anon,authenticated;
grant insert,update on public.project_categories,public.skills to authenticated;

create function public.project_slug_base(p_title text)
returns text language sql immutable set search_path='' as $$
  select coalesce(nullif(trim(both '-' from regexp_replace(lower(normalize(btrim(p_title),NFKD)),'[^a-z0-9]+','-','g')),''),'project');
$$;
revoke all on function public.project_slug_base(text) from public;

-- One transaction persists core fields and replaces the current draft's role/skill set.
create function public.save_project_draft(p_project_id uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=auth.uid(); bid uuid; pid uuid; current_status public.project_moderation_status;
  role_data jsonb; role_id uuid; role_title text; role_description text; slots integer;
  required_ids jsonb; preferred_ids jsonb; slug_base text; candidate_slug text;
  skill_count integer;
  amount numeric; duration integer;
begin
  if uid is null or not exists(select 1 from public.accounts a join public.user_roles ur on ur.account_id=a.id where a.auth_user_id=uid and ur.role='BUSINESS') then raise exception 'Business role required'; end if;
  select bp.id into bid from public.business_profiles bp join public.accounts a on a.id=bp.account_id where a.auth_user_id=uid;
  if bid is null or not exists(select 1 from public.business_verifications bv where bv.business_id=bid and bv.status='VERIFIED') then raise exception 'Verified business required'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or jsonb_typeof(coalesce(p_payload->'roles','[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_payload->'roles','[]'::jsonb))>12 then raise exception 'Invalid project data'; end if;
  amount:=nullif(p_payload->>'proposedCompensationAmount','')::numeric;
  duration:=nullif(p_payload->>'estimatedDurationDays','')::integer;
  if amount is not null and (amount<=0 or amount::text in ('NaN','Infinity','-Infinity')) then raise exception 'Invalid proposed compensation'; end if;
  if (p_payload->>'paymentType'='UNPAID' and amount is not null) or (duration is not null and duration not between 1 and 365) then raise exception 'Invalid payment or duration'; end if;

  if p_project_id is null then
    pid:=gen_random_uuid();
    slug_base:=public.project_slug_base(coalesce(p_payload->>'title','project'));
    candidate_slug:=left(slug_base,83)||'-'||replace(pid::text,'-','');
    insert into public.projects(id,business_id,public_slug,title,problem_statement,objective,scope,expected_deliverables,category_id,difficulty,payment_type,proposed_compensation_amount,estimated_duration_days)
    values(pid,bid,candidate_slug,btrim(p_payload->>'title'),btrim(p_payload->>'problemStatement'),btrim(p_payload->>'objective'),btrim(p_payload->>'scope'),btrim(p_payload->>'expectedDeliverables'),(p_payload->>'categoryId')::uuid,(p_payload->>'difficulty')::public.project_difficulty,(p_payload->>'paymentType')::public.project_payment_type,amount,duration);
  else
    select p.moderation_status into current_status from public.projects p where p.id=p_project_id and p.business_id=bid for update;
    if current_status is null then raise exception 'Project not found'; end if;
    if current_status not in ('DRAFT','REVISION_REQUESTED','REJECTED','APPROVED') then raise exception 'Project cannot be edited in this state'; end if;
    if exists(select 1 from public.projects p where p.id=p_project_id and p.lifecycle_status='CANCELLED') then raise exception 'Cancelled project cannot be edited'; end if;
    update public.projects set title=btrim(p_payload->>'title'),problem_statement=btrim(p_payload->>'problemStatement'),objective=btrim(p_payload->>'objective'),scope=btrim(p_payload->>'scope'),expected_deliverables=btrim(p_payload->>'expectedDeliverables'),category_id=(p_payload->>'categoryId')::uuid,difficulty=(p_payload->>'difficulty')::public.project_difficulty,payment_type=(p_payload->>'paymentType')::public.project_payment_type,proposed_compensation_amount=amount,estimated_duration_days=duration,
      moderation_status='DRAFT',visibility='PRIVATE',published_at=null,updated_at=now()
    where id=p_project_id returning id into pid;
  end if;

  delete from public.project_role_skills prs using public.project_roles r where prs.project_role_id=r.id and r.project_id=pid;
  delete from public.project_roles where project_id=pid;
  for role_data in select value from jsonb_array_elements(coalesce(p_payload->'roles','[]'::jsonb)) loop
    role_title:=btrim(role_data->>'title'); role_description:=btrim(role_data->>'description'); slots:=(role_data->>'slotCount')::integer;
    if length(role_title) not between 2 and 100 or length(role_description) not between 10 and 1600 or slots not between 1 and 20 then raise exception 'Invalid project role'; end if;
    required_ids:=coalesce(role_data->'requiredSkillIds','[]'::jsonb); preferred_ids:=coalesce(role_data->'preferredSkillIds','[]'::jsonb);
    if jsonb_typeof(required_ids)<>'array' or jsonb_typeof(preferred_ids)<>'array' or jsonb_array_length(required_ids)>20 or jsonb_array_length(preferred_ids)>20 then raise exception 'Invalid role skills'; end if;
    if exists(select 1 from jsonb_array_elements_text(required_ids) x where x.value in (select jsonb_array_elements_text(preferred_ids))) then raise exception 'A skill cannot be both required and preferred'; end if;
    insert into public.project_roles(project_id,title,description,slot_count) values(pid,role_title,role_description,slots) returning id into role_id;
    select count(distinct value::uuid) into skill_count from jsonb_array_elements_text(required_ids);
    if skill_count<>jsonb_array_length(required_ids) then raise exception 'Duplicate required skill'; end if;
    select count(distinct value::uuid) into skill_count from jsonb_array_elements_text(preferred_ids);
    if skill_count<>jsonb_array_length(preferred_ids) then raise exception 'Duplicate preferred skill'; end if;
    select count(*) into skill_count from public.skills s where s.is_active and s.id in (
      select value::uuid from jsonb_array_elements_text(required_ids)
      union
      select value::uuid from jsonb_array_elements_text(preferred_ids)
    );
    if skill_count<>jsonb_array_length(required_ids)+jsonb_array_length(preferred_ids) then raise exception 'Unknown or inactive skill'; end if;
    insert into public.project_role_skills(project_role_id,skill_id,requirement_type) select role_id,value::uuid,'REQUIRED' from jsonb_array_elements_text(required_ids);
    insert into public.project_role_skills(project_role_id,skill_id,requirement_type) select role_id,value::uuid,'PREFERRED' from jsonb_array_elements_text(preferred_ids);
  end loop;
  return pid;
end; $$;

create function public.submit_project_for_review(p_project_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare bid uuid; p public.projects%rowtype; next_attempt int; review_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.accounts a join public.user_roles ur on ur.account_id=a.id where a.auth_user_id=auth.uid() and ur.role='BUSINESS') then raise exception 'Business role required'; end if;
 select bp.id into bid from public.business_profiles bp join public.accounts a on a.id=bp.account_id where a.auth_user_id=auth.uid();
 if bid is null or not exists(select 1 from public.business_verifications bv where bv.business_id=bid and bv.status='VERIFIED') then raise exception 'Verified business required'; end if;
 select * into p from public.projects where id=p_project_id and business_id=bid for update;
 if p.id is null or p.moderation_status not in ('DRAFT','REVISION_REQUESTED','REJECTED') or p.lifecycle_status<>'NOT_STARTED' then raise exception 'Project cannot be submitted in this state'; end if;
 if length(btrim(p.title)) not between 5 and 120 or length(btrim(p.problem_statement)) not between 30 and 4000 or length(btrim(p.objective)) not between 20 and 2400 or length(btrim(p.scope)) not between 20 and 6000 or length(btrim(p.expected_deliverables)) not between 20 and 4000 then raise exception 'Project content is incomplete'; end if;
 if not exists(select 1 from public.project_categories c where c.id=p.category_id and c.is_active) then raise exception 'Project category is unavailable'; end if;
 if not exists(select 1 from public.project_roles r where r.project_id=p.id) then raise exception 'At least one project role is required'; end if;
 if exists(select 1 from public.project_roles r where r.project_id=p.id and not exists(select 1 from public.project_role_skills prs where prs.project_role_id=r.id and prs.requirement_type='REQUIRED')) then raise exception 'Every role requires at least one required skill'; end if;
 if exists(select 1 from public.project_roles r join public.project_role_skills prs on prs.project_role_id=r.id join public.skills s on s.id=prs.skill_id where r.project_id=p.id and not s.is_active) then raise exception 'Project uses inactive skills'; end if;
 select coalesce(max(attempt_number),0)+1 into next_attempt from public.project_moderation_reviews where project_id=p.id;
 insert into public.project_moderation_reviews(project_id,attempt_number) values(p.id,next_attempt) returning id into review_id;
 update public.projects set moderation_status='SUBMITTED',visibility='PRIVATE',published_at=null,current_review_attempt_id=review_id,updated_at=now() where id=p.id;
end; $$;

create function public.cancel_project(p_project_id uuid,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare bid uuid; p public.projects%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.accounts a join public.user_roles ur on ur.account_id=a.id where a.auth_user_id=auth.uid() and ur.role='BUSINESS') then raise exception 'Business role required'; end if;
 select bp.id into bid from public.business_profiles bp join public.accounts a on a.id=bp.account_id where a.auth_user_id=auth.uid();
 select * into p from public.projects where id=p_project_id and business_id=bid for update;
 if p.id is null or p.lifecycle_status<>'NOT_STARTED' or p.moderation_status not in ('DRAFT','REVISION_REQUESTED','APPROVED') then raise exception 'Project cannot be cancelled in this state'; end if;
 update public.projects set lifecycle_status='CANCELLED',visibility='PRIVATE',published_at=null,cancelled_at=now(),cancelled_by_account_id=public.current_account_id(),cancellation_reason=nullif(btrim(p_reason),''),updated_at=now() where id=p.id;
end; $$;

create function public.admin_start_project_review(p_project_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare review_id uuid;
begin
 if not public.is_admin() then raise exception 'Admin role required'; end if;
 perform 1 from public.projects where id=p_project_id and moderation_status='SUBMITTED' for update;
 if not found then raise exception 'Submitted project required'; end if;
 select current_review_attempt_id into review_id from public.projects where id=p_project_id;
 update public.project_moderation_reviews set review_started_at=now() where id=review_id and decision is null and review_started_at is null;
 update public.projects set moderation_status='UNDER_REVIEW',updated_at=now() where id=p_project_id;
end; $$;

create function public.admin_decide_project(p_project_id uuid,p_decision text,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare review_id uuid; next_status public.project_moderation_status;
begin
 if not public.is_admin() then raise exception 'Admin role required'; end if;
 if p_decision is null or p_decision not in ('APPROVED','REQUEST_REVISION','REJECTED') or (p_decision in ('REQUEST_REVISION','REJECTED') and length(btrim(coalesce(p_reason,'')))<3) then raise exception 'Invalid moderation decision'; end if;
 select current_review_attempt_id into review_id from public.projects where id=p_project_id and moderation_status='UNDER_REVIEW' and lifecycle_status='NOT_STARTED' for update;
 if review_id is null then raise exception 'Project is not under review'; end if;
 if exists(select 1 from public.project_moderation_reviews where id=review_id and decision is not null) then raise exception 'Review attempt already decided'; end if;
 if p_decision='APPROVED' and not exists(select 1 from public.projects p join public.business_verifications bv on bv.business_id=p.business_id where p.id=p_project_id and bv.status='VERIFIED') then raise exception 'Business verification must remain current for approval'; end if;
 next_status:=case p_decision when 'APPROVED' then 'APPROVED'::public.project_moderation_status when 'REQUEST_REVISION' then 'REVISION_REQUESTED'::public.project_moderation_status else 'REJECTED'::public.project_moderation_status end;
 update public.project_moderation_reviews set decision=p_decision::public.project_review_decision,reason=nullif(btrim(p_reason),''),reviewed_at=now(),reviewer_account_id=public.current_account_id() where id=review_id;
 update public.projects set moderation_status=next_status,visibility=case when p_decision='APPROVED' then 'PUBLIC'::public.project_visibility else 'PRIVATE'::public.project_visibility end,published_at=case when p_decision='APPROVED' then now() else null end,updated_at=now() where id=p_project_id;
end; $$;

-- The public DTO deliberately omits business_id, contact fields, NIB, and moderation history.
create function public.project_marketplace(p_q text default null,p_category text default null,p_difficulty text default null,p_payment text default null,p_skill text default null,p_slug text default null,p_limit integer default 24,p_offset integer default 0)
returns table(project_slug text,title text,problem_statement text,objective text,scope text,expected_deliverables text,category_name text,category_slug text,difficulty public.project_difficulty,payment_type public.project_payment_type,proposed_compensation_amount numeric,estimated_duration_days integer,published_at timestamptz,business_name text,business_description text,business_verified boolean,roles jsonb)
language plpgsql stable security definer set search_path='' as $$
begin
 if p_limit is null or p_offset is null or p_limit not between 1 and 50 or p_offset<0 or length(coalesce(p_q,''))>120 then raise exception 'Invalid marketplace query'; end if;
 return query
 select p.public_slug,p.title,p.problem_statement,p.objective,p.scope,p.expected_deliverables,c.name,c.slug,p.difficulty,p.payment_type,p.proposed_compensation_amount,p.estimated_duration_days,p.published_at,b.business_name,left(coalesce(b.description,''),500),true,
  coalesce((select jsonb_agg(jsonb_build_object(
    'title',r.title,'description',r.description,'slotCount',r.slot_count,
    'requiredSkills',coalesce((select jsonb_agg(s.name order by s.name) from public.project_role_skills prs join public.skills s on s.id=prs.skill_id where prs.project_role_id=r.id and prs.requirement_type='REQUIRED'),'[]'::jsonb),
    'preferredSkills',coalesce((select jsonb_agg(s.name order by s.name) from public.project_role_skills prs join public.skills s on s.id=prs.skill_id where prs.project_role_id=r.id and prs.requirement_type='PREFERRED'),'[]'::jsonb)
  ) order by r.created_at) from public.project_roles r where r.project_id=p.id),'[]'::jsonb)
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

create function public.business_list_projects()
returns table(project_id uuid,public_slug text,title text,moderation_status public.project_moderation_status,lifecycle_status public.project_lifecycle_status,visibility public.project_visibility,published_at timestamptz,updated_at timestamptz)
language sql stable security definer set search_path='' as $$
 select p.id,p.public_slug,p.title,p.moderation_status,p.lifecycle_status,p.visibility,p.published_at,p.updated_at
 from public.projects p join public.business_profiles b on b.id=p.business_id join public.accounts a on a.id=b.account_id
 where a.auth_user_id=auth.uid() and exists(select 1 from public.user_roles r where r.account_id=a.id and r.role='BUSINESS') order by p.updated_at desc;
$$;

create function public.business_get_project(p_project_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 select jsonb_build_object(
   'id',p.id,'slug',p.public_slug,'title',p.title,'problemStatement',p.problem_statement,'objective',p.objective,'scope',p.scope,'expectedDeliverables',p.expected_deliverables,'categoryId',p.category_id,'difficulty',p.difficulty,'paymentType',p.payment_type,'proposedCompensationAmount',p.proposed_compensation_amount,'estimatedDurationDays',p.estimated_duration_days,'moderationStatus',p.moderation_status,'lifecycleStatus',p.lifecycle_status,'visibility',p.visibility,'publishedAt',p.published_at,'cancellationReason',p.cancellation_reason,
   'roles',coalesce((select jsonb_agg(jsonb_build_object('title',r.title,'description',r.description,'slotCount',r.slot_count,'requiredSkillIds',coalesce((select jsonb_agg(prs.skill_id) from public.project_role_skills prs where prs.project_role_id=r.id and prs.requirement_type='REQUIRED'),'[]'::jsonb),'preferredSkillIds',coalesce((select jsonb_agg(prs.skill_id) from public.project_role_skills prs where prs.project_role_id=r.id and prs.requirement_type='PREFERRED'),'[]'::jsonb)) order by r.created_at) from public.project_roles r where r.project_id=p.id),'[]'::jsonb),
   'history',coalesce((select jsonb_agg(jsonb_build_object('attemptNumber',h.attempt_number,'submittedAt',h.submitted_at,'reviewStartedAt',h.review_started_at,'reviewedAt',h.reviewed_at,'decision',h.decision,'reason',h.reason) order by h.attempt_number desc) from public.project_moderation_reviews h where h.project_id=p.id),'[]'::jsonb)
 ) into result from public.projects p join public.business_profiles b on b.id=p.business_id join public.accounts a on a.id=b.account_id
 where p.id=p_project_id and a.auth_user_id=auth.uid() and exists(select 1 from public.user_roles ur where ur.account_id=a.id and ur.role='BUSINESS');
 return result;
end; $$;

create function public.admin_project_review_queue()
returns table(project_id uuid,title text,public_slug text,submitted_at timestamptz,business_name text,business_verified boolean,category text,difficulty public.project_difficulty,payment_type public.project_payment_type,moderation_status public.project_moderation_status)
language sql stable security definer set search_path='' as $$
 select p.id,p.title,p.public_slug,pv.submitted_at,b.business_name,bv.status='VERIFIED',c.name,p.difficulty,p.payment_type,p.moderation_status
 from public.projects p join public.business_profiles b on b.id=p.business_id join public.business_verifications bv on bv.business_id=b.id join public.project_categories c on c.id=p.category_id join public.project_moderation_reviews pv on pv.id=p.current_review_attempt_id
 where public.is_admin() and p.moderation_status in ('SUBMITTED','UNDER_REVIEW') order by pv.submitted_at;
$$;

create function public.admin_get_project(p_project_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Admin role required'; end if;
 select jsonb_build_object(
  'id',p.id,'slug',p.public_slug,'title',p.title,'problemStatement',p.problem_statement,'objective',p.objective,'scope',p.scope,'expectedDeliverables',p.expected_deliverables,'difficulty',p.difficulty,'paymentType',p.payment_type,'proposedCompensationAmount',p.proposed_compensation_amount,'estimatedDurationDays',p.estimated_duration_days,'moderationStatus',p.moderation_status,'lifecycleStatus',p.lifecycle_status,'visibility',p.visibility,'category',c.name,'businessName',b.business_name,'businessDescription',left(coalesce(b.description,''),500),'businessVerificationStatus',bv.status,
  'roles',coalesce((select jsonb_agg(jsonb_build_object('title',r.title,'description',r.description,'slotCount',r.slot_count,'requiredSkills',coalesce((select jsonb_agg(s.name order by s.name) from public.project_role_skills prs join public.skills s on s.id=prs.skill_id where prs.project_role_id=r.id and prs.requirement_type='REQUIRED'),'[]'::jsonb),'preferredSkills',coalesce((select jsonb_agg(s.name order by s.name) from public.project_role_skills prs join public.skills s on s.id=prs.skill_id where prs.project_role_id=r.id and prs.requirement_type='PREFERRED'),'[]'::jsonb)) order by r.created_at) from public.project_roles r where r.project_id=p.id),'[]'::jsonb),
  'history',coalesce((select jsonb_agg(jsonb_build_object('attemptNumber',h.attempt_number,'submittedAt',h.submitted_at,'reviewStartedAt',h.review_started_at,'reviewedAt',h.reviewed_at,'reviewerAccountId',h.reviewer_account_id,'decision',h.decision,'reason',h.reason) order by h.attempt_number desc) from public.project_moderation_reviews h where h.project_id=p.id),'[]'::jsonb)
 ) into result from public.projects p join public.business_profiles b on b.id=p.business_id join public.business_verifications bv on bv.business_id=b.id join public.project_categories c on c.id=p.category_id where p.id=p_project_id;
 return result;
end; $$;

revoke all on function public.save_project_draft(uuid,jsonb) from public;
revoke all on function public.submit_project_for_review(uuid) from public;
revoke all on function public.cancel_project(uuid,text) from public;
revoke all on function public.admin_start_project_review(uuid) from public;
revoke all on function public.admin_decide_project(uuid,text,text) from public;
revoke all on function public.project_marketplace(text,text,text,text,text,text,integer,integer) from public;
revoke all on function public.business_list_projects() from public;
revoke all on function public.business_get_project(uuid) from public;
revoke all on function public.admin_project_review_queue() from public;
revoke all on function public.admin_get_project(uuid) from public;
grant execute on function public.save_project_draft(uuid,jsonb),public.submit_project_for_review(uuid),public.cancel_project(uuid,text),public.business_list_projects(),public.business_get_project(uuid) to authenticated;
grant execute on function public.admin_start_project_review(uuid),public.admin_decide_project(uuid,text,text),public.admin_project_review_queue(),public.admin_get_project(uuid) to authenticated;
grant execute on function public.project_marketplace(text,text,text,text,text,text,integer,integer) to anon,authenticated;
