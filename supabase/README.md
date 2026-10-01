# Supabase setup and Phase 1–3 security notes

Database changes are versioned in `supabase/migrations`. Phase 1 creates the
account/role foundation; Phase 2 adds identity, education, verification, private
evidence, and guardian-consent workflows; Phase 3 adds projects, roles, skills,
moderation, and safe marketplace reads.

## Apply migrations

1. Create a Supabase project and copy its project URL and publishable key.
2. Copy `.env.example` to `.env.local` and set the values. Set
   `NEXT_PUBLIC_SITE_URL` to the deployed app origin when deploying.
3. Install the Supabase CLI, authenticate with `supabase login`, link the
   project with `supabase link --project-ref <project-ref>`, then apply all three
   migrations with `supabase db push --linked`.
4. In Supabase Auth URL Configuration, set the Site URL and add the app's
   `/auth/callback` route to Redirect URLs.
5. Confirm the `verification-evidence` bucket is private and its 5 MiB limit and
   PDF/JPEG/PNG/WebP allowlist match migration `202609300002`.

This workspace has no Supabase credentials or CLI, and the local Docker engine
is unavailable. Migrations `202609300001` through `202609300003` have not been
applied or replayed against a live or local PostgreSQL database. Runtime RLS status is therefore
`PENDING_RUNTIME_VERIFICATION`.

## Migration freeze and Phase 4 gate

Before the first shared/remote environment applies a migration, corrections may
still be made to these historical files. Once a migration has been successfully
applied to any shared/remote environment, do not edit that historical file;
make every later correction as a new timestamped migration. Record the applied
migration version in the deployment record.

Phase 4 is gated on applying migrations `202609300001`–`202609300003` to a
PostgreSQL/Supabase runtime and passing the Phase 1–3 baseline RLS integration
checklist below. Until both are recorded as passing, Phase 4 readiness is
`BLOCKED UNTIL RUNTIME RLS VERIFICATION`.

Keep the `private` schema created by Phase 3 out of PostgREST's exposed schema
list. It contains SECURITY DEFINER authorization helpers used by RLS.

## Controlled ADMIN provisioning

Public registration only accepts STUDENT and BUSINESS. To promote an existing
account, create and confirm it through regular signup, then run this statement
in the Supabase SQL editor as the project operator. Since `user_roles.account_id`
is the primary key, this replaces the existing role; it cannot add a second
role.

```sql
update public.user_roles
set role = 'ADMIN'
where account_id = (
  select a.id
  from public.accounts as a
  join auth.users as u on u.id = a.auth_user_id
  where u.email = 'admin@example.com'
);
```

Do not expose a service-role key or role mutation endpoint to the browser.
`bootstrap_account` rejects ADMIN and never overwrites an existing role.

## Phase 2 data access

- Institutions are readable by authenticated users; only Admin can create or
  update them. This avoids duplicate public institution creation.
- Student/business profiles are scoped to their owner and Admin. Profile update
  grants exclude account IDs, role fields, identity, and verification state.
- Academic identities and date of birth have no direct client table grants.
  Onboarding writes identity through an authenticated SECURITY DEFINER RPC;
  students get only their own minor/consent eligibility result. Admin gets the
  date of birth and academic identity only inside the verification review queue.
- Verification attempts and evidence metadata preserve history. Attempt rows
  are not deleted by normal workflows; reviewer account deletion sets the
  reviewer reference to null. Final student/business decisions mark evidence
  `retention_at` 90 days later. There is no destructive purge job yet.
- The `verification-evidence` Storage bucket is private. Object paths use the
  Supabase Auth UUID, never an NIM/NISN. Owner access is tied to a matching
  evidence row and owner profile; Admin evidence access is through a guarded
  route that issues a 60-second signed URL. Anonymous Storage access is not
  granted.
- Guardian tokens are 256-bit random hex values. Only SHA-256 digests are stored;
  the link keeps the token in a URL fragment, which browsers do not send with
  the initial page request or referrer. Confirmation consumes the token once.
  Student requests are limited to three per 24 hours. For deployment, configure
  an edge/WAF rate limit on guardian consent page/action traffic and redact
  query/body data in observability systems; the random token is never logged by
  app code. Guardian consent is a platform record, not a legal digital signature.
- Full date of birth is retained in a private table to compute age eligibility
  automatically as a student turns 18. It is not in a profile/passport/public
  response. Admin can see it only in student verification review. This stores
  more sensitive data than a one-time age flag, but avoids stale minor status.
- NIM normalization uses NFKC, whitespace removal, and uppercase. NIM uniqueness
  is institution-scoped. NISN removes whitespace and common hyphens, is checked
  as ten digits, and is globally unique. Raw values are private database fields;
  no HMAC key is required in normal onboarding. A keyed HMAC can be added with a
  later blocked-identity/moderation migration.
- Deleting a linked Auth user tombstones its Account rather than hard-deleting
  history. The Phase 2 trigger stamps `deleted_at` and `purge_eligible_at` on the
  Account and AcademicIdentity; raw identity becomes purge-eligible 30 days
  later. No automatic purge job is installed. After confirming the deletion and
  policy, a scheduled job can delete `academic_identities` where
  `purge_eligible_at <= now()`; deleting the whole identity row also removes the
  normalized value and its uniqueness reservation. Do not retain the raw value
  in a future BlockedIdentity table; Phase 9 uses a keyed digest only.
- Phase 3 public project reads use `project_marketplace`, which returns an
  explicit DTO. Project tables have no direct API table grants. The `private`
  authorization helpers must stay outside exposed API schemas; public users
  receive project-specific verification projection through the DTO only.

## Runtime RLS acceptance checklist

After applying migrations, verify with separate student, business, Admin, and
anonymous sessions across Phases 1–3:

1. Authenticated users read only their own Account/Profile/Verification rows.
2. Students cannot read other student identities, private DOB, or attempts.
3. Businesses cannot read other business verification data or student records.
4. Anonymous clients cannot read any profile, identity, attempt, or evidence.
5. Owner role changes and direct AcademicIdentity/private verification writes
   fail; public registration cannot create ADMIN or overwrite an existing role.
6. Only Admin can create institutions, review queues, decide attempts, or read
   another owner's evidence. Rejected/revision decisions require a reason.
7. Storage accepts only owner-scoped paths, while public downloads fail and
   signed evidence URLs expire promptly.
8. Project rows and moderation history are inaccessible by direct anonymous
   PostgREST table queries; the public RPC exposes only approved, published,
   non-cancelled projects from verified businesses and omits private contacts,
   NIB, evidence, internal business IDs, and review reasons.
9. Student/business cannot create or moderate projects by direct table writes;
   only a verified business owner can save/submit/cancel within allowed states,
   and only Admin can open/review/decide submissions.
10. Approve publishes atomically; revision/reject are private and retain reasons;
    an approved edit unpublishes and returns to DRAFT; cancellation preserves
    project roles, skill assignments, and moderation attempts.

Record the outcome as `PASS` only after these checks run against the applied
database. Until then, retain `PENDING_RUNTIME_VERIFICATION` and do not begin
Phase 4.
