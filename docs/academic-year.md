# Academic-year rule

Used for the profile rings and, from Milestone 4, for messaging eligibility.

## Stored data

`admission_year`: the calendar year the student joined (for example 2024). This is the only year-related fact stored for a student. The current year of study is **calculated**, never stored from the browser.

## Calendar

- An academic year starts on **1 July** (month 7), evaluated in **Asia/Kolkata**.
- **Assumption to confirm:** 1 July is a placeholder for the real KIET start date. It is one constant (`ACADEMIC_YEAR_START_MONTH`) in `src/lib/academic-year.ts`.

## Rule

```
academic_start_year = this calendar year   if month >= 7
                      previous year        otherwise
year_of_study       = academic_start_year - admission_year + 1
```

| Result | Meaning |
|---|---|
| 1 to programme length | `current`, with that year of study |
| below 1 | `not_started` |
| above programme length | `completed` |

Programme length defaults to 4 years (B.Tech) and can be 1 to 4 (MBA is 2). Five-year programmes are not supported yet because the brief defines only four ring colours.

## Administrator override

An authorised administrator may set an override year (1 to programme length) for exceptional cases such as a repeated year. It takes precedence over the calculation and is reported as `admin_override`. Users can never set it. In Milestone 2 this becomes an admin-only column with an audit entry.

## Rings

| Standing | Ring |
|---|---|
| Year 1 | Dark blue |
| Year 2 | Yellow |
| Year 3 | Purple |
| Year 4 | Green |
| Alumni | Dashed ink ring with a cap badge |
| Completed, not started, unknown | Neutral |

The ring is always paired with a text label ("2nd year") so colour is never the only signal.

## Authoritative implementation

Milestone 1 ships the rule as a pure TypeScript function with unit tests. From Milestone 2 the **database** computes it (a SQL function over `admission_year` and the override), RLS and messaging checks call that function, and the TypeScript version is kept only for display and for parity tests against the SQL version.

## Use in discovery (Milestone 3)

Directory cards and public profiles compute the year of study in `src/lib/discovery/person.ts` with `computeAcademicStanding` (same IST / 1 July rule). The year filter converts "Nth year" to an admission year with `academicStartYear()` in the app and passes it to `search_public_profiles()`; the database only compares integers, so the calendar rule still lives in one place. Programme length is inferred from the free-text programme (MBA = 2, otherwise 4) by `programmeDurationYears()` in TypeScript and `public.programme_duration_years()` in SQL; keep the two in step until programme and duration become stored, validated fields.


## Messaging behavior in Milestone 4

The Milestone 3 schema has no persisted administrator override-year column, so Milestone 4 does not add one. SQL messaging eligibility uses the same IST/July 1 programme-duration calculation and returns no current year for unknown, not-started, or completed students. Student messaging fails closed when a current standing cannot be established. The shared CSV fixture in `supabase/tests/fixtures/academic-year-parity.csv` is read by both the TypeScript parity test and the local SQL test.
