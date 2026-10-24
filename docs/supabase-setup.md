# Supabase setup and manual migrations (Milestones 2 and 3)

Nothing in this repository talks to a remote Supabase project on its own, and no
migration is ever applied automatically. You do each step below yourself.

## 1. Create a project
Create a **new** Supabase project for development (do not reuse production).

## 2. Configure environment variables
Copy `.env.example` to `.env.local` (git-ignored) and fill in:

| Variable | Where to find it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project settings > API | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project settings > API (anon / publishable key) | Safe for browsers; protected by RLS. The app **refuses** to start auth if you paste a service-role / secret key here. |
| `NEXT_PUBLIC_SITE_URL` | Your deployment origin | Used in confirmation emails. Empty = Supabase dashboard "Site URL". |
| `ALLOWED_EMAIL_DOMAINS` | Optional | e.g. your university domain. Empty = anyone may sign up. |

Do **not** put the service-role key in `.env.local` or in Vercel for this app. Milestone 2 does not use it, and `npm run check:static` fails if app code references it.

## 3. Apply the migrations (in order)
Open the SQL editor of your dev project, read, then run:

1. `supabase/migrations/0001_profiles.sql` (profiles, RLS, grants, triggers, `public_profiles` view)
2. `supabase/migrations/0002_avatar_storage.sql` (private `avatars` bucket and policies)
3. `supabase/migrations/0003_discovery.sql` (discovery, safe public view, search helper)
4. `supabase/migrations/0004_messaging.sql` (conversations, messages, eligibility enforcement, blocks, private reports, rate guard, Realtime publication)

Or, with the Supabase CLI linked to a project you control: `supabase db push`. Do not use it until you have explicitly linked the CLI to your **development** project and reviewed each migration.
The migrations are designed to be additive, but `0003` replaces the `public_profiles` view definition. The automated tests have not been run against a real Supabase project, and this environment cannot execute the local PostgreSQL tests; review the SQL and test against a disposable development project first.

## 4. Auth settings (Dashboard > Authentication)
- Providers > Email: enabled, **Confirm email = ON**.
- URL configuration: set **Site URL** to your deployment; add `<site>/auth/callback` (and `http://localhost:3000/auth/callback` for dev) to **Redirect URLs**. Do not add wildcards you do not need.
- Password policy: minimum length 10 or more (the app also enforces 10 to 72).
- Rate limits: keep Supabase's defaults or tighter; Supabase Auth enforces them server-side.
- Optional: Auth > Hooks or an email-domain allow-list if you want the domain restriction enforced in Supabase and not only in the app.

## 5. Make the first admin (optional)
Admins are set only from the SQL editor (never from the app):
```sql
update public.profiles set role = 'admin' where id = '<user uuid>';
```

## What the database enforces
- `profiles`: members can SELECT/UPDATE only their own row, and only the columns listed in the grant. `role`, `verification_status`, `id`, `created_at` are not writable by members (column grants **and** a trigger).
- `private_profiles` (email, phone): owner-only. Email is read-only for members and mirrors `auth.users`.
- `public_profiles` view: signed-in users only; safe columns only; hides `is_public = false` rows. No email, phone or role.
- No client INSERT or DELETE on profiles; rows are created by a trigger on `auth.users` (display name only is taken from signup metadata; role is never read from metadata).
- Discovery (0003): `search_public_profiles()` is **SECURITY INVOKER** and reads only `public_profiles`, so it runs with the caller's own rights. `anon` cannot execute it. It returns an allow-listed set of columns (no email, phone, role, `is_public`, verification status, bio or avatar path), trims and caps text input, escapes `%` / `_`, clamps page size to 1 to 50 and offset to 0 to 10000, and uses no dynamic SQL. Members with `verification_status = 'rejected'` are hidden by the view everywhere.
- Storage: private bucket, 2 MiB, JPEG/PNG/WebP, objects only at `<own user id>/<name>.<ext>`; reads limited to your own avatar or avatars of public profiles; the app serves them via 1-hour signed URLs.

## Verification
- `npm run test:db` applies all migrations to a **throwaway local PostgreSQL** (temporary directory and socket; no network) with small stubs for Supabase's `auth` / `storage` schemas, then runs each SQL test file, including RLS and messaging eligibility, privacy, blocks, report access, and academic-year parity. It requires PostgreSQL server binaries; by default it skips if they are absent. Use `REQUIRE_DB_TESTS=1 npm run test:db` to make missing PostgreSQL a hard failure.
- The stubs are approximations. They do not replace testing against a real Supabase dev project: after step 3, sign up two test users and confirm the behaviours above by hand.

## Known limits (honest list)
- CSP still uses `script-src 'unsafe-inline'` (Next.js inline bootstrap). A nonce-based policy is a later hardening step.
- Messaging has an initial database guard of 30 sends per sender per minute. Other app endpoints do not yet have general application-level rate limiting; assess abuse controls before public launch.
- **No onboarding-status column exists.** Because `is_public` defaults to true and a new member's display name can be derived from their email, a stop-gap in `search_public_profiles()` hides profiles that hold nothing but the auto-generated name (no programme, years, company, role, bio or skills). Replace it with a real `onboarded_at` (or default `is_public` to false) once you decide the onboarding rule. Direct links to such a profile still work through the view.
- **No email-visibility setting exists.** Email and phone are simply never exposed by any public surface, which is the safe default. A member-controlled option would need a new column and a view change.
- `programme` is free text. Programme and company filters use case-insensitive "contains" matching instead of dropdowns, and MBA is treated as a 2-year programme (a documented assumption, mirrored in SQL and TypeScript). Store a validated programme and duration to remove this.
- Discovery search uses `ILIKE` without a trigram index. That is fine for thousands of members; add `pg_trgm` indexes if the directory grows much larger.
- Directory cards show initials, not photos (no signed-URL batching yet).
- `/people/[id]` serves real profiles when Supabase is configured (signed-in members only; private, rejected or unknown ids return 404) and the sample profiles when it is not.
- Sign-in is email + password with email confirmation. Password reset, OAuth and magic links are not built yet.

## Testing discovery against a development project (Milestone 3)

1. Apply `0001`, `0002`, `0003` in order to a **development** project and fill `.env.local` (see sections 2 and 3).
2. `npm install && npm run dev`, then sign up three test members with real email confirmation (Auth > Providers > Email: Confirm email ON). Use throwaway addresses.
3. In `/profile` give each member a programme, an admission year (students) or graduation year, company and role (alumni), and a few skills. Tick "visible to other members" for two of them, and leave the third private.
4. Promote one account to admin from the SQL editor if you want to test verification: `update public.profiles set verification_status = 'verified' where id = '<uuid>';` and set another to `'rejected'`.
5. Signed out: `/discover`, `/alumni` and `/people/<uuid>` must show a sign-in prompt, not data.
6. Signed in as member 1, check on `/discover` and `/alumni`:
   - the public members appear; the private member and the rejected member do not;
   - name, programme and skill search, the year filter, sort and "Open to mentoring" all narrow results; `%` and `_` in a search match literally;
   - a search with no matches shows the "No students match" state; `?page=99` shows "No more results";
   - the card links open `/people/<uuid>` and show the same member; email and phone appear nowhere on any page or in the page source.
7. In the browser dev tools Network tab, results arrive inside the page (server-rendered), and no request goes to `/rest/v1/profiles` or `/rest/v1/private_profiles` from discovery pages.
8. Optional SQL-level check as that member (SQL editor, `set role authenticated` with `request.jwt.claim.sub` set): `select * from public.search_public_profiles('student');` returns only the allow-listed columns, and `select email from public.search_public_profiles('student');` fails.


## Messaging verification (Milestone 4)

After reviewing `0004_messaging.sql` and applying the migrations to a disposable **development** project only:

1. Create eligible test accounts: two current students in different years, two in the same year, one student with unknown standing, one alumnus who is open to mentoring, and one who is not. Use test accounts only.
2. Sign in as the first eligible student, open a different-year student's profile, choose **Message**, and send a message. Confirm it appears after refresh and in the second account's thread.
3. Confirm same-year and unknown-standing student pairs cannot start or send messages, and that the mentoring preference controls student/alumni messaging. Confirm alumni/alumni works when both profiles are visible.
4. Block each direction in turn. Confirm neither side can send while either block exists; unblock and verify that sending resumes only when other eligibility rules allow it.
5. Open the same conversation as an unrelated third account and confirm the route and API reveal no conversation or message content. Confirm a private profile's existing participants can still read history under a neutral "Member" label, while new sends are disabled.
6. Confirm retrying the same client message ID does not create a duplicate, the message report API accepts a permitted category but exposes no report list to members, and the UI degrades to periodic refresh if Realtime is unavailable.

Do not use production conversation content to test these behaviours. The repository's local SQL test suite should pass before applying the migration to any development Supabase project; it was not executable in the authoring environment because PostgreSQL server binaries were unavailable.
