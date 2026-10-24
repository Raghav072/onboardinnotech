# ONBOARD v2 (Milestone 3)

**ONBOARD, Your All-in-Uni Companion.** Brand system, application shell, responsive navigation and page structure for the new Next.js application.

> **Status: development preview.** Milestone 1 UI (sample data), the Milestone 2 Supabase foundation (email authentication, profile management, database schema with Row Level Security, avatar storage) and Milestone 3 member discovery (searchable student and alumni directories and real public-profile pages). It does nothing with Supabase until you configure it (see `docs/supabase-setup.md`); unconfigured, the app behaves exactly like Milestone 1. There is still no Gemini integration or payment code.

## Where this lives

The original prototype (`onboard_website_v4/`) is untouched and kept as a reference. This application is a separate folder, `onboard-v2/`. In your real clone, create the branch first, then copy the folder in:

```bash
git checkout -b feature/onboard-v2
# copy onboard-v2/ into the repository, then
git add onboard-v2 && git commit -m "ONBOARD v2: Milestone 1 (brand, shell, page structure)"
```

Do not deploy this branch to production. Create a separate Vercel project (or use the branch's preview URL) with the Root Directory set to `onboard-v2`.

## Run it

Requires Node 22.6 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run test:db    # migrations + RLS tests on a throwaway local PostgreSQL
npm run check      # typecheck + lint + unit tests + DB tests + static guardrails
```

`npm run check` runs `tsc --noEmit`, ESLint, the unit tests (`node --test`, no extra dependencies) and `scripts/check-static.mjs`, which fails if a removed feature, the old purple palette, a secret-like value or a real `.env` file appears in the project.

## What exists

| Area | Where |
|---|---|
| Brand tokens (exact palette) | `src/lib/brand.ts`, `tailwind.config.ts` |
| Logo (icon, wordmark, light/dark, favicon, app icons) | `public/*.svg`, `public/icons/`, `src/app/icon.svg`, `src/components/brand/Logo.tsx` |
| Application shell and navigation | `src/components/layout/` |
| Pages | `src/app/` (Home, Discover People, Alumni, Marketplace + listing, Campus Info + Events + Centres, Messages, My Profile, person profile, Design system) |
| Academic-year rule and ring colours | `src/lib/academic-year.ts`, `docs/academic-year.md` |
| Messaging policy and enforcement | `docs/messaging-policy.md`, `supabase/migrations/0004_messaging.sql`, `src/app/api/messages/` |
| Sample data | `src/lib/mock/` (all fictional) |
| Supabase clients, session middleware | `src/lib/supabase/`, `src/middleware.ts` |
| Auth (sign in / up / out, callback) | `src/app/login`, `src/app/auth/` |
| Profile editing, avatar upload | `src/app/profile/`, `src/components/profile/` |
| Member discovery: parameter validation, RPC query, view-model | `src/lib/discovery/` |
| Directory pages, filters, results, pagination | `src/components/people/Directory*.tsx`, `src/components/ui/Pagination.tsx`, `src/app/discover`, `src/app/alumni`, `src/app/people/[id]` |
| Validation (pure, unit-tested) | `src/lib/validation/`, `src/lib/auth/` |
| SQL migrations and DB tests | `supabase/migrations/`, `supabase/tests/` |

Open `/design-system` to review the palette, contrast ratios, logo variants and rings.

## Removed from the prototype

The post composer and social feed, the Achievements section, the Info Hub with roadmaps and subscription UI, and the purple/mint palette. `check:static` guards against these coming back.

## Honest limitations

- Discover People, Alumni and `/people/[id]` use real data only when Supabase is configured and the member is signed in; otherwise they show the Milestone 1 sample layout. Marketplace and Campus filters are unchanged placeholders.
- Campus Events and Centres of Excellence are empty states. No KIET event or centre data has been entered because none has been verified.
- Listing photos are placeholders. Profile photos are initials.
- Not yet in place: nonce-based CSP, password reset / OAuth, an onboarding-status field and a member email-visibility setting (email is simply never shown), directory photos. Messaging includes a database rate guard but no moderator dashboard for reviewing message reports. See `docs/supabase-setup.md`, "Known limits".

## Environment variables

`.env.example` lists variable names with empty values. Milestones 2 and 3 read only the Supabase URL and anon key, `NEXT_PUBLIC_SITE_URL` and `ALLOWED_EMAIL_DOMAINS`. The service-role key is never used. Never commit real values.


## Milestone 4: messaging

The additive `supabase/migrations/0004_messaging.sql` migration implements conversation storage, participant-only RLS, academic-year/mentoring eligibility, idempotent start, send-time enforcement, bidirectional blocks, a 30-message-per-minute sender limit, private message reports, and publication of `messages` for Supabase Realtime. The app adds `/messages`, `/messages/[id]`, and session-bound API routes.

Before using messaging, review the migration, run `npm run test:db` on a local PostgreSQL server, and apply the migration manually to a **development** Supabase project. This project was not deployed and no remote migration was executed while building this milestone. The admin report-review workflow is outside this milestone.
