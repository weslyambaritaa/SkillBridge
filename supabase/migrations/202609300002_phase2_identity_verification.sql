-- Phase 2: identity, education, verification, private evidence and guardian consent.
-- No project, marketplace, application, payment, or passport domain is introduced here.

create extension if not exists pgcrypto with schema extensions;

create type public.institution_type as enum ('UNIVERSITY', 'VOCATIONAL_SCHOOL');
create type public.student_type as enum ('COLLEGE', 'VOCATIONAL_SCHOOL');
create type public.academic_identity_type as enum ('NIM', 'NISN');
create type public.student_verification_status as enum ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
create type public.business_verification_status as enum ('UNVERIFIED', 'PENDING', 'REQUEST_REVISION', 'VERIFIED', 'REJECTED');
create type public.verification_attempt_status as enum ('DRAFT', 'PENDING', 'VERIFIED', 'REQUEST_REVISION', 'REJECTED');
create type public.guardian_consent_status as enum ('PENDING', 'CONSENTED', 'REVOKED', 'EXPIRED');

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  type public.institution_type not null,
  name text not null check (length(btrim(name)) between 2 and 180),
  normalized_name text not null,
  city_regency text check (city_regency is null or length(city_regency) <= 120),
  province text check (province is null or length(province) <= 120),
  created_at timestamptz not null default now(),
  unique (type, normalized_name)
);

create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.accounts(id) on delete restrict,
  student_type public.student_type not null,
  display_name text not null check (length(btrim(display_name)) between 2 and 100),
  bio text check (bio is null or length(bio) <= 1200),
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.education_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.student_profiles(id) on delete restrict,
  institution_id uuid not null references public.institutions(id) on delete restrict,
  study_program text,
  semester smallint check (semester is null or semester between 1 and 16),
  major text,
  grade smallint check (grade is null or grade between 10 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (study_program is not null and length(btrim(study_program)) between 1 and 160 and semester is not null and major is null and grade is null)
    or (major is not null and length(btrim(major)) between 1 and 160 and grade is not null and study_program is null and semester is null)
  )
);

create table public.student_private_data (
  student_id uuid primary key references public.student_profiles(id) on delete restrict,
  date_of_birth date not null check (date_of_birth >= date '1900-01-01'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academic_identities (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.student_profiles(id) on delete restrict,
  identity_type public.academic_identity_type not null,
  normalized_identity text not null,
  identity_value text not null,
  institution_id uuid references public.institutions(id) on delete restrict,
  verification_status public.student_verification_status not null default 'UNVERIFIED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  retention_at timestamptz,
  deleted_at timestamptz,
  purge_eligible_at timestamptz,
  check ((identity_type = 'NIM' and institution_id is not null) or (identity_type = 'NISN' and institution_id is null)),
  unique (institution_id, identity_type, normalized_identity)
);
create unique index academic_identities_nisn_unique
  on public.academic_identities (identity_type, normalized_identity)
  where identity_type = 'NISN';
create index academic_identities_purge_eligible_idx
  on public.academic_identities(purge_eligible_at) where purge_eligible_at is not null;

-- Deleting the linked Auth user tombstones the Account and starts a 30-day
-- raw academic identity purge window; durable verification history remains.
create function public.mark_account_auth_deleted()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.auth_user_id is not null and new.auth_user_id is null then
    new.deleted_at := coalesce(new.deleted_at, now());
    new.purge_eligible_at := coalesce(new.purge_eligible_at, new.deleted_at + interval '30 days');
    new.updated_at := now();
    update public.academic_identities ai
      set deleted_at = new.deleted_at,
          purge_eligible_at = new.purge_eligible_at,
          retention_at = new.purge_eligible_at,
          updated_at = now()
      from public.student_profiles sp
      where sp.account_id = old.id and ai.student_id = sp.id;
  end if;
  return new;
end;
$$;
create trigger accounts_auth_deleted_lifecycle
  before update of auth_user_id on public.accounts
  for each row execute function public.mark_account_auth_deleted();
revoke all on function public.mark_account_auth_deleted() from public;

create table public.student_verifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.student_profiles(id) on delete restrict,
  status public.student_verification_status not null default 'UNVERIFIED',
  current_attempt_id uuid,
  updated_at timestamptz not null default now()
);

create table public.student_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.student_verifications(id) on delete restrict,
  attempt_number integer not null check (attempt_number > 0),
  status public.verification_attempt_status not null default 'DRAFT',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_account_id uuid references public.accounts(id) on delete set null,
  reason text check (reason is null or length(reason) <= 1200),
  retention_at timestamptz,
  created_at timestamptz not null default now(),
  unique (verification_id, attempt_number),
  unique (id, verification_id)
);
alter table public.student_verifications
  add constraint student_verifications_current_attempt_fk
  foreign key (current_attempt_id, id)
  references public.student_verification_attempts(id, verification_id)
  on delete restrict;
create unique index student_one_open_attempt_idx on public.student_verification_attempts(verification_id)
  where status in ('DRAFT', 'PENDING');

create table public.student_verification_evidence (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.student_verification_attempts(id) on delete restrict,
  storage_path text not null unique,
  original_filename text not null check (length(original_filename) <= 180),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  created_at timestamptz not null default now(),
  retention_at timestamptz
);

create table public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.accounts(id) on delete restrict,
  business_name text not null check (length(btrim(business_name)) between 2 and 160),
  description text check (description is null or length(description) <= 2000),
  business_category text not null check (length(btrim(business_category)) between 2 and 100),
  business_email text check (business_email is null or length(business_email) <= 254),
  business_phone text check (business_phone is null or length(business_phone) <= 32),
  website text check (website is null or length(website) <= 2048),
  social_url text check (social_url is null or length(social_url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_verifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.business_profiles(id) on delete restrict,
  status public.business_verification_status not null default 'UNVERIFIED',
  nib text,
  current_attempt_id uuid,
  updated_at timestamptz not null default now()
);

create table public.business_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.business_verifications(id) on delete restrict,
  attempt_number integer not null check (attempt_number > 0),
  status public.verification_attempt_status not null default 'DRAFT',
  evidence_description text not null check (length(btrim(evidence_description)) between 5 and 1200),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_account_id uuid references public.accounts(id) on delete set null,
  reason text check (reason is null or length(reason) <= 1200),
  retention_at timestamptz,
  created_at timestamptz not null default now(),
  unique (verification_id, attempt_number),
  unique (id, verification_id)
);
alter table public.business_verifications
  add constraint business_verifications_current_attempt_fk
  foreign key (current_attempt_id, id)
  references public.business_verification_attempts(id, verification_id)
  on delete restrict;
create unique index business_one_open_attempt_idx on public.business_verification_attempts(verification_id)
  where status in ('DRAFT', 'PENDING');

create table public.business_verification_evidence (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.business_verification_attempts(id) on delete restrict,
  storage_path text not null unique,
  original_filename text not null check (length(original_filename) <= 180),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  created_at timestamptz not null default now(),
  retention_at timestamptz
);

create table public.guardian_consents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete restrict,
  guardian_name text not null check (length(btrim(guardian_name)) between 2 and 120),
  relationship text not null check (length(btrim(relationship)) between 2 and 80),
  guardian_contact text not null check (length(btrim(guardian_contact)) between 3 and 254),
  policy_version text not null check (length(policy_version) between 1 and 32),
  status public.guardian_consent_status not null default 'PENDING',
  token_digest bytea unique,
  token_expires_at timestamptz not null,
  requested_at timestamptz not null default now(),
  consented_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index guardian_consents_student_idx on public.guardian_consents(student_id, requested_at desc);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.accounts a join public.user_roles r on r.account_id = a.id
    where a.auth_user_id = auth.uid() and r.role = 'ADMIN'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.current_student_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select s.id from public.student_profiles s join public.accounts a on a.id = s.account_id where a.auth_user_id = auth.uid() limit 1;
$$;
create or replace function public.current_business_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select b.id from public.business_profiles b join public.accounts a on a.id = b.account_id where a.auth_user_id = auth.uid() limit 1;
$$;
revoke all on function public.current_student_id() from public;
revoke all on function public.current_business_id() from public;
grant execute on function public.current_student_id() to authenticated;
grant execute on function public.current_business_id() to authenticated;

-- Authenticated owner/admin helper policies use account UUIDs, never client-supplied roles.
alter table public.institutions enable row level security;
alter table public.student_profiles enable row level security;
alter table public.education_records enable row level security;
alter table public.student_private_data enable row level security;
alter table public.academic_identities enable row level security;
alter table public.student_verifications enable row level security;
alter table public.student_verification_attempts enable row level security;
alter table public.student_verification_evidence enable row level security;
alter table public.business_profiles enable row level security;
alter table public.business_verifications enable row level security;
alter table public.business_verification_attempts enable row level security;
alter table public.business_verification_evidence enable row level security;
alter table public.guardian_consents enable row level security;

create policy institutions_read_authenticated on public.institutions for select to authenticated using (true);
create policy institutions_admin_insert on public.institutions for insert to authenticated with check ((select public.is_admin()));
create policy institutions_admin_update on public.institutions for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy student_profile_owner_read on public.student_profiles for select to authenticated using (account_id = (select public.current_account_id()) or (select public.is_admin()));
create policy student_profile_owner_insert on public.student_profiles for insert to authenticated with check (account_id = (select public.current_account_id()) and exists (select 1 from public.user_roles r where r.account_id = (select public.current_account_id()) and r.role = 'STUDENT'));
create policy student_profile_owner_update on public.student_profiles for update to authenticated using (account_id = (select public.current_account_id())) with check (account_id = (select public.current_account_id()));
create policy education_owner_all on public.education_records for all to authenticated using (student_id = (select public.current_student_id()) or (select public.is_admin())) with check (student_id = (select public.current_student_id()) or (select public.is_admin()));
create policy private_data_admin_read on public.student_private_data for select to authenticated using ((select public.is_admin()));
create policy verification_owner_admin_read on public.student_verifications for select to authenticated using (student_id = (select public.current_student_id()) or (select public.is_admin()));
create policy student_attempt_owner_admin_read on public.student_verification_attempts for select to authenticated using (exists(select 1 from public.student_verifications v where v.id = verification_id and (v.student_id = (select public.current_student_id()) or (select public.is_admin()))));
create policy student_evidence_owner_admin_read on public.student_verification_evidence for select to authenticated using (exists(select 1 from public.student_verification_attempts a join public.student_verifications v on v.id = a.verification_id where a.id = attempt_id and (v.student_id = (select public.current_student_id()) or (select public.is_admin()))));
create policy business_owner_admin_read on public.business_profiles for select to authenticated using (account_id = (select public.current_account_id()) or (select public.is_admin()));
create policy business_owner_insert on public.business_profiles for insert to authenticated with check (account_id = (select public.current_account_id()) and exists (select 1 from public.user_roles r where r.account_id = (select public.current_account_id()) and r.role = 'BUSINESS'));
create policy business_owner_update on public.business_profiles for update to authenticated using (account_id = (select public.current_account_id())) with check (account_id = (select public.current_account_id()));
create policy business_verification_owner_admin_read on public.business_verifications for select to authenticated using (business_id = (select public.current_business_id()) or (select public.is_admin()));
create policy business_attempt_owner_admin_read on public.business_verification_attempts for select to authenticated using (exists(select 1 from public.business_verifications v where v.id = verification_id and (v.business_id = (select public.current_business_id()) or (select public.is_admin()))));
create policy business_evidence_owner_admin_read on public.business_verification_evidence for select to authenticated using (exists(select 1 from public.business_verification_attempts a join public.business_verifications v on v.id = a.verification_id where a.id = attempt_id and (v.business_id = (select public.current_business_id()) or (select public.is_admin()))));
create policy guardian_owner_read on public.guardian_consents for select to authenticated using (student_id = (select public.current_student_id()) or (select public.is_admin()));

-- No direct client writes to identity, private DOB, verification workflow, evidence metadata, or guardian state.
revoke all on public.academic_identities, public.student_private_data,
  public.student_verifications, public.student_verification_attempts,
  public.student_verification_evidence, public.business_verifications,
  public.business_verification_attempts, public.business_verification_evidence,
  public.guardian_consents from anon, authenticated;
grant select on public.institutions, public.student_profiles, public.education_records,
  public.student_verifications, public.student_verification_attempts,
  public.student_verification_evidence, public.business_profiles,
  public.business_verifications, public.business_verification_attempts,
  public.business_verification_evidence, public.guardian_consents to authenticated;
grant update (display_name,bio,photo_path,updated_at) on public.student_profiles to authenticated;
grant select on public.education_records to authenticated;
grant update (business_name,description,business_category,business_email,business_phone,website,social_url,updated_at) on public.business_profiles to authenticated;
grant insert, update on public.institutions to authenticated;

-- Normalize with PostgreSQL NFKC so uniqueness does not depend on browser behavior.
create function public.normalize_academic_identity(p_type public.academic_identity_type, p_value text)
returns text language plpgsql immutable set search_path = '' as $$
declare v text;
begin
  v := upper(regexp_replace(btrim(normalize(p_value, NFKC)), '[[:space:]]+', '', 'g'));
  if p_type = 'NISN' then v := regexp_replace(v, '[-‐‑‒–—]', '', 'g'); end if;
  return v;
end;
$$;
revoke all on function public.normalize_academic_identity(public.academic_identity_type, text) from public;
grant execute on function public.normalize_academic_identity(public.academic_identity_type, text) to authenticated;

create function public.save_student_onboarding(
  p_type public.student_type, p_display_name text, p_bio text, p_institution_id uuid,
  p_study_program text, p_semester smallint, p_major text, p_grade smallint,
  p_identity_type public.academic_identity_type, p_identity_value text, p_date_of_birth date
) returns uuid language plpgsql security definer set search_path = '' as $$
declare sid uuid; aid uuid; normalized text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.accounts a join public.user_roles r on r.account_id=a.id where a.auth_user_id=auth.uid() and r.role='STUDENT') then raise exception 'Student role required'; end if;
  if length(btrim(p_display_name)) not between 2 and 100 or (p_bio is not null and length(p_bio)>1200) then raise exception 'Invalid profile'; end if;
  if p_type='COLLEGE' then
    if p_identity_type<>'NIM' or p_institution_id is null or p_study_program is null or p_semester not between 1 and 16 or p_major is not null or p_grade is not null then raise exception 'Invalid college education data'; end if;
    if not exists(select 1 from public.institutions i where i.id=p_institution_id and i.type='UNIVERSITY') then raise exception 'Institution type mismatch'; end if;
  else
    if p_identity_type<>'NISN' or p_institution_id is null or p_major is null or p_grade not between 10 and 12 or p_study_program is not null or p_semester is not null then raise exception 'Invalid vocational education data'; end if;
    if not exists(select 1 from public.institutions i where i.id=p_institution_id and i.type='VOCATIONAL_SCHOOL') then raise exception 'Institution type mismatch'; end if;
  end if;
  if p_identity_value is null or length(btrim(p_identity_value)) not between 3 and 64 then raise exception 'Invalid academic identity'; end if;
  normalized := public.normalize_academic_identity(p_identity_type, p_identity_value);
  if p_identity_type='NISN' and normalized !~ '^[0-9]{10}$' then raise exception 'NISN must contain ten digits'; end if;
  if p_identity_type='NIM' and normalized !~ '^[A-Z0-9][A-Z0-9/._-]{1,63}$' then raise exception 'Invalid NIM format'; end if;
  if p_date_of_birth is null or p_date_of_birth > current_date or p_date_of_birth < date '1900-01-01' then raise exception 'Invalid date of birth'; end if;
  insert into public.student_profiles(account_id, student_type, display_name, bio)
    select a.id, p_type, btrim(p_display_name), nullif(btrim(p_bio),'') from public.accounts a where a.auth_user_id=auth.uid()
    on conflict(account_id) do update set student_type=excluded.student_type, display_name=excluded.display_name, bio=excluded.bio, updated_at=now()
    returning id into sid;
  insert into public.education_records(student_id,institution_id,study_program,semester,major,grade)
    values(sid,p_institution_id,nullif(btrim(p_study_program),''),p_semester,nullif(btrim(p_major),''),p_grade)
    on conflict(student_id) do update set institution_id=excluded.institution_id, study_program=excluded.study_program, semester=excluded.semester, major=excluded.major, grade=excluded.grade, updated_at=now();
  if exists(select 1 from public.academic_identities ai where ai.student_id=sid and (ai.identity_type<>p_identity_type or ai.normalized_identity<>normalized or ai.institution_id is distinct from case when p_identity_type='NIM' then p_institution_id else null end)) then
    raise exception 'Academic identity is immutable after onboarding; contact support to correct it';
  end if;
  insert into public.academic_identities(student_id,identity_type,normalized_identity,identity_value,institution_id)
    values(sid,p_identity_type,normalized,p_identity_value,case when p_identity_type='NIM' then p_institution_id else null end)
    on conflict(student_id) do nothing;
  insert into public.student_verifications(student_id) values(sid) on conflict(student_id) do nothing;
  insert into public.student_private_data(student_id,date_of_birth) values(sid,p_date_of_birth)
    on conflict(student_id) do update set date_of_birth=case when exists(select 1 from public.student_verifications v where v.student_id=sid and v.status='VERIFIED') then public.student_private_data.date_of_birth else excluded.date_of_birth end, updated_at=now();
  return sid;
exception when unique_violation then raise exception 'Academic identity is already registered';
end;
$$;
revoke all on function public.save_student_onboarding(public.student_type,text,text,uuid,text,smallint,text,smallint,public.academic_identity_type,text,date) from public;
grant execute on function public.save_student_onboarding(public.student_type,text,text,uuid,text,smallint,text,smallint,public.academic_identity_type,text,date) to authenticated;

create function public.save_business_profile(p_name text,p_description text,p_category text,p_email text,p_phone text,p_website text,p_social_url text,p_nib text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare bid uuid; current_status public.business_verification_status; existing_nib text; existing_name text; existing_category text; existing_website text; existing_social text;
begin
  if auth.uid() is null or not exists(select 1 from public.accounts a join public.user_roles r on r.account_id=a.id where a.auth_user_id=auth.uid() and r.role='BUSINESS') then raise exception 'Business role required'; end if;
  if length(btrim(p_name)) not between 2 and 160 or length(btrim(p_category)) not between 2 and 100 then raise exception 'Invalid business profile'; end if;
  if p_website is not null and p_website !~ '^https?://' then raise exception 'Invalid website URL'; end if;
  if p_social_url is not null and p_social_url !~ '^https?://' then raise exception 'Invalid social URL'; end if;
  select b.id,b.business_name,b.business_category,v.status,v.nib,b.website,b.social_url into bid,existing_name,existing_category,current_status,existing_nib,existing_website,existing_social
  from public.business_profiles b join public.business_verifications v on v.business_id=b.id
  where b.account_id=(select public.current_account_id()) for update of b,v;
  if current_status='VERIFIED' and (existing_name is distinct from btrim(p_name) or existing_category is distinct from btrim(p_category) or existing_nib is distinct from nullif(btrim(p_nib),'') or existing_website is distinct from nullif(btrim(p_website),'') or existing_social is distinct from nullif(btrim(p_social_url),'')) then
    raise exception 'Verified business identity fields cannot be changed without review';
  end if;
  insert into public.business_profiles(account_id,business_name,description,business_category,business_email,business_phone,website,social_url)
    select a.id,btrim(p_name),nullif(btrim(p_description),''),btrim(p_category),nullif(btrim(p_email),''),nullif(btrim(p_phone),''),nullif(btrim(p_website),''),nullif(btrim(p_social_url),'') from public.accounts a where a.auth_user_id=auth.uid()
    on conflict(account_id) do update set business_name=excluded.business_name,description=excluded.description,business_category=excluded.business_category,business_email=excluded.business_email,business_phone=excluded.business_phone,website=excluded.website,social_url=excluded.social_url,updated_at=now() returning id into bid;
  insert into public.business_verifications(business_id,nib) values(bid,nullif(btrim(p_nib),'')) on conflict(business_id) do update set nib=excluded.nib,updated_at=now();
  return bid;
end;
$$;
revoke all on function public.save_business_profile(text,text,text,text,text,text,text,text) from public;
grant execute on function public.save_business_profile(text,text,text,text,text,text,text,text) to authenticated;

create function public.start_student_verification()
returns uuid language plpgsql security definer set search_path = '' as $$
declare sid uuid; vid uuid; aid uuid; n int;
begin
 sid:=public.current_student_id(); if sid is null then raise exception 'Student profile required'; end if;
 if not exists(select 1 from public.education_records where student_id=sid) then raise exception 'Complete onboarding first'; end if;
 insert into public.student_verifications(student_id) values(sid) on conflict(student_id) do nothing;
  select id into vid from public.student_verifications where student_id=sid for update;
  if exists(select 1 from public.student_verifications where id=vid and status='VERIFIED') then raise exception 'Student verification is already complete'; end if;
 if exists(select 1 from public.student_verification_attempts where verification_id=vid and status='PENDING') then raise exception 'An attempt is already pending'; end if;
 select id into aid from public.student_verification_attempts where verification_id=vid and status='DRAFT' order by attempt_number desc limit 1;
 if aid is not null then return aid; end if;
 select coalesce(max(attempt_number),0)+1 into n from public.student_verification_attempts where verification_id=vid;
 insert into public.student_verification_attempts(verification_id,attempt_number) values(vid,n) returning id into aid;
 update public.student_verifications set current_attempt_id=aid,status='UNVERIFIED',updated_at=now() where id=vid;
 return aid;
end; $$;

create function public.attach_student_evidence(p_attempt_id uuid,p_path text,p_filename text,p_mime text,p_size int)
returns uuid language plpgsql security definer set search_path = '' as $$
declare eid uuid;
begin
 if not exists(select 1 from public.student_verification_attempts a join public.student_verifications v on v.id=a.verification_id where a.id=p_attempt_id and v.student_id=public.current_student_id() and a.status='DRAFT') then raise exception 'Attempt unavailable'; end if;
 if p_path !~ ('^'||auth.uid()::text||'/student/'||p_attempt_id::text||'/[a-f0-9-]+\.(pdf|jpg|png|webp)$') then raise exception 'Invalid evidence path'; end if;
 insert into public.student_verification_evidence(attempt_id,storage_path,original_filename,mime_type,size_bytes) values(p_attempt_id,p_path,left(p_filename,180),p_mime,p_size) returning id into eid;
 return eid;
end; $$;

create function public.submit_student_verification(p_attempt_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.student_verification_attempts a join public.student_verifications v on v.id=a.verification_id where a.id=p_attempt_id and v.student_id=public.current_student_id() and a.status='DRAFT') then raise exception 'Attempt unavailable'; end if;
 if not exists(select 1 from public.student_verification_evidence where attempt_id=p_attempt_id) then raise exception 'Evidence required'; end if;
 update public.student_verification_attempts set status='PENDING',submitted_at=now() where id=p_attempt_id;
 update public.student_verifications v set status='PENDING',updated_at=now() from public.student_verification_attempts a where a.id=p_attempt_id and v.id=a.verification_id;
end; $$;

create function public.start_business_verification(p_description text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare bid uuid; vid uuid; aid uuid; n int;
begin
 bid:=public.current_business_id(); if bid is null then raise exception 'Business profile required'; end if;
 if length(btrim(p_description)) not between 5 and 1200 then raise exception 'Evidence description required'; end if;
 insert into public.business_verifications(business_id) values(bid) on conflict(business_id) do nothing;
 select id into vid from public.business_verifications where business_id=bid for update;
 if exists(select 1 from public.business_verifications where id=vid and status='VERIFIED') then raise exception 'Business verification is already complete'; end if;
 if exists(select 1 from public.business_verification_attempts where verification_id=vid and status='PENDING') then raise exception 'An attempt is already pending'; end if;
 select id into aid from public.business_verification_attempts where verification_id=vid and status='DRAFT' order by attempt_number desc limit 1;
 if aid is not null then update public.business_verification_attempts set evidence_description=btrim(p_description) where id=aid; return aid; end if;
 select coalesce(max(attempt_number),0)+1 into n from public.business_verification_attempts where verification_id=vid;
 insert into public.business_verification_attempts(verification_id,attempt_number,evidence_description) values(vid,n,btrim(p_description)) returning id into aid;
 update public.business_verifications set current_attempt_id=aid,status='UNVERIFIED',updated_at=now() where id=vid;
 return aid;
end; $$;

create function public.attach_business_evidence(p_attempt_id uuid,p_path text,p_filename text,p_mime text,p_size int)
returns uuid language plpgsql security definer set search_path = '' as $$
declare eid uuid;
begin
 if not exists(select 1 from public.business_verification_attempts a join public.business_verifications v on v.id=a.verification_id where a.id=p_attempt_id and v.business_id=public.current_business_id() and a.status='DRAFT') then raise exception 'Attempt unavailable'; end if;
 if p_path !~ ('^'||auth.uid()::text||'/business/'||p_attempt_id::text||'/[a-f0-9-]+\.(pdf|jpg|png|webp)$') then raise exception 'Invalid evidence path'; end if;
 insert into public.business_verification_evidence(attempt_id,storage_path,original_filename,mime_type,size_bytes) values(p_attempt_id,p_path,left(p_filename,180),p_mime,p_size) returning id into eid;
 return eid;
end; $$;

create function public.submit_business_verification(p_attempt_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.business_verification_attempts a join public.business_verifications v on v.id=a.verification_id where a.id=p_attempt_id and v.business_id=public.current_business_id() and a.status='DRAFT') then raise exception 'Attempt unavailable'; end if;
 if not exists(select 1 from public.business_verification_evidence where attempt_id=p_attempt_id)
   and not exists(select 1 from public.business_verifications where current_attempt_id=p_attempt_id and nullif(btrim(nib),'') is not null)
   and not exists(select 1 from public.business_verifications v join public.business_profiles b on b.id=v.business_id where v.current_attempt_id=p_attempt_id and (b.website is not null or b.social_url is not null)) then raise exception 'Evidence required'; end if;
 update public.business_verification_attempts set status='PENDING',submitted_at=now() where id=p_attempt_id;
 update public.business_verifications v set status='PENDING',updated_at=now() from public.business_verification_attempts a where a.id=p_attempt_id and v.id=a.verification_id;
end; $$;

create function public.admin_decide_student_verification(p_attempt_id uuid,p_decision text,p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare vid uuid; sid uuid; aid uuid;
begin
 if not public.is_admin() then raise exception 'Admin role required'; end if;
 if p_decision not in ('VERIFIED','REJECTED') or (p_decision='REJECTED' and length(btrim(coalesce(p_reason,'')))<3) then raise exception 'Invalid decision/reason'; end if;
 select a.verification_id,v.student_id into vid,sid from public.student_verification_attempts a join public.student_verifications v on v.id=a.verification_id where a.id=p_attempt_id and a.status='PENDING' for update of a,v;
 if vid is null then raise exception 'Pending attempt required'; end if;
 update public.student_verification_attempts set status=p_decision::public.verification_attempt_status,reviewed_at=now(),reviewer_account_id=public.current_account_id(),reason=nullif(btrim(p_reason),''),retention_at=now()+interval '90 days' where id=p_attempt_id;
 update public.student_verification_evidence set retention_at=now()+interval '90 days' where attempt_id=p_attempt_id;
 update public.student_verifications set status=p_decision::public.student_verification_status,updated_at=now() where id=vid;
 update public.academic_identities set verification_status=p_decision::public.student_verification_status,updated_at=now() where student_id=sid;
end; $$;

create function public.admin_decide_business_verification(p_attempt_id uuid,p_decision text,p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare vid uuid; result public.business_verification_status;
begin
 if not public.is_admin() then raise exception 'Admin role required'; end if;
 if p_decision not in ('VERIFIED','REQUEST_REVISION','REJECTED') or (p_decision in ('REQUEST_REVISION','REJECTED') and length(btrim(coalesce(p_reason,'')))<3) then raise exception 'Invalid decision/reason'; end if;
 select a.verification_id into vid from public.business_verification_attempts a where a.id=p_attempt_id and a.status='PENDING' for update;
 if vid is null then raise exception 'Pending attempt required'; end if;
 result:=p_decision::public.business_verification_status;
 update public.business_verification_attempts set status=p_decision::public.verification_attempt_status,reviewed_at=now(),reviewer_account_id=public.current_account_id(),reason=nullif(btrim(p_reason),''),retention_at=now()+interval '90 days' where id=p_attempt_id;
 update public.business_verification_evidence set retention_at=now()+interval '90 days' where attempt_id=p_attempt_id;
 update public.business_verifications set status=result,updated_at=now() where id=vid;
end; $$;

create function public.request_guardian_consent(p_name text,p_relationship text,p_contact text,p_policy_version text)
returns table(consent_id uuid, raw_token text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare sid uuid; born date; token text; cid uuid; expiry timestamptz;
begin
 sid:=public.current_student_id(); if sid is null then raise exception 'Student profile required'; end if;
 select date_of_birth into born from public.student_private_data where student_id=sid;
  if born is null or (born + interval '18 years')::date <= current_date then raise exception 'Guardian consent is only for students under 18'; end if;
  if length(btrim(p_name)) not between 2 and 120 or length(btrim(p_relationship)) not between 2 and 80 or length(btrim(p_contact)) not between 3 and 254 then raise exception 'Invalid guardian details'; end if;
  if p_contact !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' and p_contact !~ '^\+?[0-9 ()-]{8,24}$' then raise exception 'Guardian contact must be email or phone'; end if;
 if (select count(*) from public.guardian_consents where student_id=sid and requested_at>now()-interval '24 hours') >= 3 then raise exception 'Consent request limit reached'; end if;
 update public.guardian_consents set status='EXPIRED',token_digest=null where student_id=sid and status='PENDING';
 token:=encode(extensions.gen_random_bytes(32),'hex'); expiry:=now()+interval '7 days';
 insert into public.guardian_consents(student_id,guardian_name,relationship,guardian_contact,policy_version,token_digest,token_expires_at)
 values(sid,btrim(p_name),btrim(p_relationship),btrim(p_contact),p_policy_version,extensions.digest(token,'sha256'),expiry) returning id into cid;
 return query select cid,token,expiry;
end; $$;

create function public.get_guardian_consent_notice(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare row_data record;
begin
 if length(coalesce(p_token,''))<>64 then return jsonb_build_object('valid',false); end if;
 select c.id,s.display_name,c.policy_version,c.token_expires_at into row_data
 from public.guardian_consents c join public.student_profiles s on s.id=c.student_id
 where c.token_digest=extensions.digest(p_token,'sha256') and c.status='PENDING' and c.token_expires_at>now();
 if row_data.id is null then return jsonb_build_object('valid',false); end if;
 return jsonb_build_object('valid',true,'consent_id',row_data.id,'student_display_name',row_data.display_name,'policy_version',row_data.policy_version,'expires_at',row_data.token_expires_at);
end; $$;

create function public.confirm_guardian_consent(p_token text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
 if length(coalesce(p_token,''))<>64 then return false; end if;
 update public.guardian_consents set status='CONSENTED',consented_at=now(),token_digest=null
 where token_digest=extensions.digest(p_token,'sha256') and status='PENDING' and token_expires_at>now();
 get diagnostics changed=row_count; return changed=1;
end; $$;

create function public.student_guardian_consent_status()
returns table(is_minor boolean, consent_status public.guardian_consent_status)
language sql stable security definer set search_path = '' as $$
 select (d.date_of_birth + interval '18 years')::date > current_date,
   (select case when c.status='PENDING' and c.token_expires_at<=now() then 'EXPIRED'::public.guardian_consent_status else c.status end from public.guardian_consents c where c.student_id=s.id order by c.requested_at desc limit 1)
 from public.student_profiles s join public.student_private_data d on d.student_id=s.id
 where s.id=public.current_student_id();
$$;

create function public.student_is_eligible_for_apply(p_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select (p_student_id=public.current_student_id() or public.is_admin())
 and exists(select 1 from public.student_verifications v where v.student_id=p_student_id and v.status='VERIFIED')
 and exists(select 1 from public.student_profiles s join public.student_private_data d on d.student_id=s.id where s.id=p_student_id and ((d.date_of_birth + interval '18 years')::date <= current_date or exists(select 1 from public.guardian_consents c where c.student_id=s.id and c.status='CONSENTED')));
$$;
create function public.business_is_eligible_for_project(p_business_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select (p_business_id=public.current_business_id() or public.is_admin())
 and exists(select 1 from public.business_verifications where business_id=p_business_id and status='VERIFIED');
$$;

-- Admin queue RPCs return only fields required for review; private identity is visible only here.
create function public.admin_student_verification_queue()
returns table(attempt_id uuid,attempt_number int,submitted_at timestamptz,student_name text,student_type public.student_type,date_of_birth date,institution_name text,identity_type public.academic_identity_type,identity_value text,education_label text,status public.student_verification_status)
language sql stable security definer set search_path = '' as $$
 select a.id,a.attempt_number,a.submitted_at,s.display_name,s.student_type,d.date_of_birth,i.name,ai.identity_type,ai.identity_value,
 case when s.student_type='COLLEGE' then e.study_program||' · semester '||e.semester::text else e.major||' · kelas '||e.grade::text end,
 v.status
 from public.student_verification_attempts a join public.student_verifications v on v.id=a.verification_id
 join public.student_profiles s on s.id=v.student_id join public.student_private_data d on d.student_id=s.id join public.education_records e on e.student_id=s.id
 join public.institutions i on i.id=e.institution_id join public.academic_identities ai on ai.student_id=s.id
 where public.is_admin() and a.status='PENDING' order by a.submitted_at;
$$;
create function public.admin_business_verification_queue()
returns table(attempt_id uuid,attempt_number int,submitted_at timestamptz,business_name text,category text,nib text,evidence_description text,status public.business_verification_status)
language sql stable security definer set search_path = '' as $$
 select a.id,a.attempt_number,a.submitted_at,b.business_name,b.business_category,v.nib,a.evidence_description,v.status
 from public.business_verification_attempts a join public.business_verifications v on v.id=a.verification_id join public.business_profiles b on b.id=v.business_id
 where public.is_admin() and a.status='PENDING' order by a.submitted_at;
$$;
create function public.admin_evidence_path(p_evidence_id uuid,p_kind text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare path text;
begin
 if not public.is_admin() then raise exception 'Admin role required'; end if;
 if p_kind='STUDENT' then select storage_path into path from public.student_verification_evidence where id=p_evidence_id;
 elsif p_kind='BUSINESS' then select storage_path into path from public.business_verification_evidence where id=p_evidence_id;
 else raise exception 'Invalid evidence kind'; end if;
 if path is null then raise exception 'Evidence not found'; end if; return path;
end; $$;

revoke all on function public.save_student_onboarding(public.student_type,text,text,uuid,text,smallint,text,smallint,public.academic_identity_type,text,date) from public;
revoke all on function public.save_business_profile(text,text,text,text,text,text,text,text) from public;
revoke all on function public.start_student_verification() from public;
revoke all on function public.attach_student_evidence(uuid,text,text,text,int) from public;
revoke all on function public.submit_student_verification(uuid) from public;
revoke all on function public.start_business_verification(text) from public;
revoke all on function public.attach_business_evidence(uuid,text,text,text,int) from public;
revoke all on function public.submit_business_verification(uuid) from public;
revoke all on function public.admin_decide_student_verification(uuid,text,text) from public;
revoke all on function public.admin_decide_business_verification(uuid,text,text) from public;
revoke all on function public.request_guardian_consent(text,text,text,text) from public;
revoke all on function public.get_guardian_consent_notice(text) from public;
revoke all on function public.confirm_guardian_consent(text) from public;
revoke all on function public.student_guardian_consent_status() from public;
revoke all on function public.student_is_eligible_for_apply(uuid) from public;
revoke all on function public.business_is_eligible_for_project(uuid) from public;
revoke all on function public.admin_student_verification_queue() from public;
revoke all on function public.admin_business_verification_queue() from public;
revoke all on function public.admin_evidence_path(uuid,text) from public;
grant execute on function public.save_student_onboarding(public.student_type,text,text,uuid,text,smallint,text,smallint,public.academic_identity_type,text,date) to authenticated;
grant execute on function public.save_business_profile(text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.start_student_verification(), public.attach_student_evidence(uuid,text,text,text,int), public.submit_student_verification(uuid) to authenticated;
grant execute on function public.start_business_verification(text), public.attach_business_evidence(uuid,text,text,text,int), public.submit_business_verification(uuid) to authenticated;
grant execute on function public.admin_decide_student_verification(uuid,text,text), public.admin_decide_business_verification(uuid,text,text), public.admin_student_verification_queue(), public.admin_business_verification_queue(), public.admin_evidence_path(uuid,text) to authenticated;
grant execute on function public.request_guardian_consent(text,text,text,text), public.student_guardian_consent_status(), public.student_is_eligible_for_apply(uuid), public.business_is_eligible_for_project(uuid) to authenticated;
grant execute on function public.get_guardian_consent_notice(text), public.confirm_guardian_consent(text) to anon, authenticated;

-- Private evidence bucket. Object paths are keyed by Auth UUID, never student identifier.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('verification-evidence','verification-evidence',false,5242880,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp'];

create policy evidence_owner_read on storage.objects for select to authenticated using (
 bucket_id='verification-evidence' and (
   ((storage.foldername(name))[1]=auth.uid()::text and (
   exists(select 1 from public.student_verification_evidence e join public.student_verification_attempts a on a.id=e.attempt_id join public.student_verifications v on v.id=a.verification_id join public.student_profiles s on s.id=v.student_id join public.accounts ac on ac.id=s.account_id where e.storage_path=name and ac.auth_user_id=auth.uid())
   or exists(select 1 from public.business_verification_evidence e join public.business_verification_attempts a on a.id=e.attempt_id join public.business_verifications v on v.id=a.verification_id join public.business_profiles b on b.id=v.business_id join public.accounts ac on ac.id=b.account_id where e.storage_path=name and ac.auth_user_id=auth.uid())
   )) or (select public.is_admin())
 )
);
create policy evidence_owner_insert on storage.objects for insert to authenticated with check (
 bucket_id='verification-evidence' and (storage.foldername(name))[1]=auth.uid()::text
 and (name ~ ('^'||auth.uid()::text||'/(student|business)/[a-f0-9-]+/[a-f0-9-]+\.(pdf|jpg|png|webp)$'))
);
create policy evidence_admin_delete on storage.objects for delete to authenticated using (bucket_id='verification-evidence' and (select public.is_admin()));
