# SkillBridge

Turn Skills Into Real Experience â€” a verified micro-apprenticeship platform
connecting Indonesian technology students with real UMKM digital projects.

## Current scope

Phase 1 provides the Next.js app foundation, Supabase Auth, single-role account
authorization, and protected dashboard shells. Phase 2 provides student/business
profiles, education and private academic identity, verification attempts, private
evidence storage, Admin review, and guardian consent. Phase 3 adds project drafts,
role and skill taxonomy, Admin moderation, and a public marketplace. Applications
and later project lifecycle domains remain out of scope.

## Requirements and local setup

- Node.js 22 LTS, npm, and a Supabase project for authenticated features.
- Copy `.env.example` to `.env.local` and set the Supabase URL, publishable key,
  and site URL.
- Apply all three migrations and configure Auth redirect URLs as described in
  [Supabase setup](supabase/README.md).
- Run `npm run dev` and open `http://localhost:3000`.

The public landing page and production build work without Supabase credentials.
Auth, onboarding, verification, project, and marketplace data routes require the
migrations to be applied. Phase 4 is blocked until Phase 1–3 runtime RLS checks
pass; see [Supabase setup](supabase/README.md).

## Commands

- `npm run dev` â€” local development server
- `npm run lint` â€” ESLint
- `npm run typecheck` â€” TypeScript check
- `npm test` â€” authorization and identity/verification domain tests
- `npm run build` â€” production build

## Structure

- `src/app` â€” public and role-protected routes
- `src/features/auth` â€” auth actions, role checks, account lookup
- `src/features/identity` â€” identity, onboarding, verification, and consent
- `src/lib/supabase` â€” server/browser Supabase clients
- `supabase/migrations` â€” versioned database migrations
- `tests` â€” authorization and domain tests

## Security notes

- Public signup accepts STUDENT and BUSINESS only. ADMIN is operator-provisioned.
- No service-role key or AI secret is used in browser code.
- Account bootstrap derives identity from `auth.uid()`. RLS complements server
  route authorization; UI visibility is not authorization.
- App code does not log credentials, guardian tokens, academic identities, or
  form payloads. Configure edge rate limits and request-data redaction before
  public launch.
- Supabase migrations and RLS have not been applied or runtime-verified in this
  environment. The recorded state is `PENDING_RUNTIME_VERIFICATION` until the
  checklist in [Supabase setup](supabase/README.md) is run against a project.
