# Messaging policy (enforced in Milestone 4)

| Between | Allowed? |
|---|---|
| Student and student, different current years of study | Yes |
| Student and student, same year of study | **No** |
| Student and alumni who enabled "Open to mentoring" | Yes |
| Student and alumni who have not enabled mentoring | No |
| Alumni and alumni | Yes |
| Either side has blocked the other | No |
| A user and themselves | No |
| Student standing is unknown, not started, or completed | No for student-to-student messaging |

## Enforcement

- New conversation creation and every message send are checked in PostgreSQL. API routes use the caller's cookie session; the service-role key is not used.
- Years are derived from stored profile records, never from request data. The SQL calculation mirrors `src/lib/academic-year.ts`: academic year starts July 1 in `Asia/Kolkata`; MBA is two years and other programmes default to four years.
- Unknown, not-started, and completed student standings return no current study year. Student messaging fails closed when the standing is unavailable.
- The database serializes starts, blocks, unblocks and sends for a participant pair. A global per-sender lock also guards the 30-message-per-minute limit. The limit is a conservative initial safeguard and may need adjustment after real usage is measured.
- Blocks operate in both directions and are changed only through validated RPCs. Members can report another participant's message using a constrained category; reports are not readable through client table access. A moderation workflow for reviewing reports still needs an authorized operational process.
- Realtime message delivery is limited by the participant-only `messages` SELECT policy. Client events are filtered by conversation and merged with history/sends by message ID and client retry ID.
- Existing conversation history remains accessible to its participants if a profile becomes private, is rejected, or is deleted. Safe profile lookup falls back to the neutral name "Member". New messages are blocked when visibility, eligibility, or block policy fails.
- Messages are immutable to regular clients; no client UPDATE or DELETE grant is provided. Conversation creation and block/report writes are RPC-only.

## Covered by tests

Same-year and different-year students; alumni mentoring rules; July 1 / IST boundary and non-current standing; idempotent conversation start; message-trigger eligibility re-checks; block and unblock; report write privacy; last-activity update; historical access for participants; and denial of conversation/message reads to non-participants. The database test suite uses a throwaway local PostgreSQL instance and the shared CSV fixture in `supabase/tests/fixtures/academic-year-parity.csv`.

## Known limitations

- No administrator override-year column exists in the Milestone 3 database. Messaging does not add one; if stored academic standing cannot be computed, messaging fails closed.
- Message reports are recorded privately but this milestone does not add a moderator dashboard or response workflow.
- Rate limiting is a database guard of 30 messages per sender per minute, not a comprehensive anti-abuse or moderation system.
- This migration has not been applied to any remote database. Review it and run the SQL tests before applying to a development Supabase project.
