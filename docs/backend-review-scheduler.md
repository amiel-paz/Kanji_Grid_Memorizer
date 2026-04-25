# Backend Review Scheduler

This document records the first hosted scheduling boundary added after the local-first loop had
already clarified which responsibilities should stay local and which could move behind a server.

## Scope

This server pass adds:

- a standalone Node/TypeScript API in `server/src`
- file-backed learner scheduler storage
- hosted review-record updates from explicit review outcomes
- an explicit `getDueReviewKanji({ learnerId, now, limit })` contract
- Study-page integration for the review-bank slice only

This pass does not add:

- auth or multi-user administration
- canonical content hosting
- hosted live session queue ownership
- a production database
- hosted ownership of carryover or daily-new admission

## Ownership Boundary

The backend owns only durable scheduling records:

- per-learner review records
- due dates
- interval lengths
- success and lapse counts

The backend does not own:

- stable `KanjiEntry` facts
- live reveal state
- live queue position
- session cue opacity
- Reading MCQ option sets

Those still belong to stable content, durable local learner progress, or client session state.

Local progress still owns:

- seen counts
- confidence
- review-bank candidacy
- the small recent-miss fallback signal

Session state still owns:

- which cards are currently selected for this run
- queue rotation after the run starts
- reveal state
- per-run attempts and cue opacity

## Routes

The server currently exposes:

- `GET /api/health`
- `GET /api/v1/learners/:learnerId/scheduler`
- `POST /api/v1/learners/:learnerId/scheduler/review-outcomes`
- `POST /api/v1/learners/:learnerId/scheduler/plan`
- `POST /api/v1/learners/:learnerId/due-review-kanji`

`review-outcomes` accepts explicit review results and advances hosted due records.

`due-review-kanji` is the frontend-facing selection contract. It accepts:

- `learnerId`
- `now`
- `limit`

It returns:

- `items`
  - `kanji`
  - `dueAt`
  - `status`
  - `intervalDays`
- `remainingDueCount`

The app uses that response only for the review-bank slice after local carryover and daily-new
selection have already happened.

## Scheduling Rule

The current backend rule is intentionally small and explicit:

- `good` starts at `1` day
- later `good` intervals move `1 -> 3 -> 7`, then double up to a `120` day cap
- `again` resets the item to `learning` with a `1` day interval
- due items sort earlier `dueAt` first, then break ties by kanji

This is a first hosted due scheduler, not a finished SM-2 clone or production spaced-repetition
system.

## Client Integration

The frontend now uses one honest backend path:

1. keep carryover and daily new-item admission local
2. ask the backend for due review items up to the remaining batch limit
3. map returned kanji ids back onto local `KanjiEntry` records
4. build the active session locally

If the scheduler is unavailable or not configured, the app falls back to the older local
review-bank heuristic and labels that state in the Study UI instead of pretending the backend
decision succeeded.

## Storage

By default the server stores learner scheduler data in:

`server/data/learner-scheduler.json`

Override with:

- `KANJI_GRID_SERVER_DATA_PATH`
- `KANJI_GRID_SERVER_PORT`
- `KANJI_GRID_SERVER_ORIGIN`

## Scripts

- `npm run server:dev`
- `npm run server:start`
- `npm run server:build`

## Next Likely Follow-Ons

- decide whether learner progress should be mirrored, migrated, or split across local and hosted
  stores
- surface scheduler write failures more explicitly in the UI
- replace file-backed storage with a real database only if this server boundary proves worth
  keeping
