# Milestone 4 implementation and verification

## Implemented

- Authenticated inbox and direct conversation routes with session-bound API handlers.
- PostgreSQL conversation/message storage, participant-only row-level security, immutable messages, idempotent conversation creation and message-send retries.
- Server/database eligibility checks for current student years, student/alumni mentoring preference, privacy, and bidirectional blocks.
- Block/unblock and private message-report APIs; initial per-sender message rate guard.
- Keyset history pagination, Supabase Realtime insert subscription with cleanup, duplicate merging, and polling fallback.
- Shared academic-year parity fixture, API input validation tests, and local SQL tests for messaging/RLS.

## Checks actually run in the authoring environment

- `node --experimental-strip-types --test 'tests/**/*.test.ts'`: **70 passed, 0 failed**.
- `node scripts/check-static.mjs`: **passed** (90 source files scanned).
- `tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext src/lib/messaging/validation.ts src/lib/messaging/types.ts`: passed for those dependency-free pure modules.
- `bash scripts/test-db.sh`: skipped because PostgreSQL server binaries (`initdb`, `pg_ctl`, `psql`) were unavailable.
- Full `npm run typecheck`, lint, and Next.js build could not be verified: project dependencies were not installed, and `npm install` timed out in this environment. These are not reported as passing.

## Before using messaging

1. Keep the Milestone 3 ZIP as the untouched backup.
2. In the extracted Milestone 4 project, install dependencies and run the full checks in an environment with package-registry access.
3. Run the local database suite with PostgreSQL installed. On a shell where the project scripts run, set `REQUIRE_DB_TESTS=1` so missing PostgreSQL cannot silently count as a pass.
4. Review `supabase/migrations/0004_messaging.sql`, then apply it only to a disposable/development Supabase project after migrations `0001`–`0003`. This implementation has not deployed or applied SQL to any remote database.
5. Complete the manual test checklist in `docs/supabase-setup.md` with throwaway accounts before considering a launch.

The SQL migration and database behavior remain unverified by an actual PostgreSQL run in the authoring environment. Treat a successful local database test and a development-project smoke test as prerequisites before enabling messaging for real users.
