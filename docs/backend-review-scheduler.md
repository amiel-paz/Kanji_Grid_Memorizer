# Backend Review Scheduler

This document records the first hosted scheduling boundary added after the local-first loop had
already clarified which responsibilities should stay local and which could move behind a server.

## Scope

This server pass adds:

- a standalone Node/TypeScript API in `server/src`
- file-backed learner scheduler storage
- hosted review-record updates from explicit review outcomes
- hosted due-plan generation for future sessions

This pass does not add:

- auth or multi-user administration
- canonical content hosting
- hosted live session queue ownership
- a production database
- frontend integration to replace the current local session creation path

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

Those still belong to stable content or client session state.

## Routes

The server currently exposes:

- `GET /api/health`
- `GET /api/v1/learners/:learnerId/scheduler`
- `POST /api/v1/learners/:learnerId/scheduler/review-outcomes`
- `POST /api/v1/learners/:learnerId/scheduler/plan`

`review-outcomes` accepts explicit review results and advances hosted due records.

`plan` returns a due-first plan with:

- `dueKanji`
- `upcomingKanji`
- `remainingDueCount`

## Scheduling Rule

The current backend rule is intentionally small and explicit:

- `good` starts at `1` day
- later `good` intervals move `1 -> 3 -> 7`, then double up to a `120` day cap
- `again` resets the item to `learning` with a `1` day interval
- due plans sort earlier `dueAt` first, then break ties by kanji

This is a first hosted due scheduler, not a finished SM-2 clone or production spaced-repetition
system.

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

- connect the client session-creation path to `plan`
- decide whether learner progress should be mirrored, migrated, or split across local and hosted
  stores
- replace file-backed storage with a real database only if this server boundary proves worth
  keeping
