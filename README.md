# Kanji Grid Memorizer

Kanji Grid Memorizer is a local-first React/TypeScript study MVP for one product idea:
each kanji owns a stable 2x2 base-8 color cue, and the active drill decides how much of
that cue to show.

This repo is now an honest first local MVP, not a finished long-term learning system. It
is far enough along to use daily on one device or hand to a friend for a truthful preview,
while still being explicit about what is and is not implemented.

## What This Repo Is Today

- A Vite + React + TypeScript web app with Study, Seen library, and Manual intake views.
- A Joyo-first canonical deck materialized from explicit in-repo Joyo and Jinmeiyo source inputs.
- Mock kanji fixture data kept separately for development and tests.
- Four drill shells: Learn, Faded recall, Blind recall, and Reading MCQ.
- Session-owned cue opacity and a simple rotating queue.
- Local-only progress persistence after explicit review grading.
- A small backend scheduler server for due review items, backed by an in-repo file store.
- A small daily study loop: unfinished carryover first, then today's truly new allowance, then
  durable review-bank review selection from either the backend due scheduler or a documented local
  fallback.
- A read-only seen library sourced from durable learner progress plus stable canonical content.
- A manual intake view for marking an outside encounter as seen without pretending that it is
  already learned.
- Honest empty and completion states when a new local batch cannot or does not need to queue cards.
- Tests around the current study shell, session rules, progress helpers, and local store behavior.

## Setup And Scripts

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

Run the optional local review scheduler:

```bash
npm run server:start
```

Run checks:

```bash
npm test
npm run build
npm run lint
```

What each script does:

- `npm run dev`: starts the Vite dev server.
- `npm run server:start`: starts the local review scheduler server on `http://localhost:8787`.
- `npm run server:dev`: runs the scheduler server in watch mode for local development.
- `npm run server:build`: type-checks and builds the scheduler server.
- `npm test`: runs the Vitest test suite.
- `npm run build`: runs TypeScript project build plus Vite production build.
- `npm run lint`: runs ESLint across the repo.

## Current Behavior

- The default drill is Faded recall.
- A fresh session still aims for a 10-card batch, but newly created sessions can admit only up to 5 truly new kanji per local day from durable saved progress.
- Newly created sessions keep carryover and today's truly new admission local.
- If `VITE_REVIEW_SCHEDULER_BASE_URL` points at the local scheduler server, the review-bank slice is
  requested through `getDueReviewKanji({ learnerId, now, limit })` and only due backend items are
  admitted.
- If the scheduler is not configured or unavailable, the app falls back to the older local
  review-bank heuristic and labels that path explicitly in the Study UI.
- The fallback review-bank heuristic still orders cards with higher durable
  `recentReviewFailureCount` first, with more recent `lastReviewFailureAt` breaking ties before any
  remaining random choice.
- Older carryover reduces that day's fresh-new allowance; same-day carryover does not double-count because `firstSeenAt` already consumed today's slot.
- Kanji that have already cleared the new-item fade ladder now persist as review-bank candidates in durable progress and can fill the rest of the batch. If there are not enough due backend items yet, the batch may honestly stay smaller.
- Switching drills recreates the session for the chosen mode and resets reveal state. Live cue opacity does not carry across drill switches.
- Learn keeps the full cue, meanings, onyomi, and kunyomi visible and uses `Next kanji` to move through the current session without grading.
- Faded recall uses a reveal-first review loop: try recall, reveal readings and meanings, then grade with `Again` or `Good`.
- Blind recall uses the same reveal-first flow, but the cue stays hidden at `0%` before and after grading.
- Reading MCQ shows the target kanji's on and kun readings and asks the learner to choose the
  matching kanji from 4 options. A correct choice counts as `Good`; a wrong choice counts as
  `Again` through the existing local progress path.
- In Faded recall, cue opacity is session-owned and follows the ladder `100% -> 66% -> 33% -> 0%` on `Good`. `Again` raises it one step.
- Faded recall now starts each new session at `100%` cue visibility, even if durable progress already exists for that kanji.
- Reading MCQ distractors are chosen from the same local deck by the three smallest normalized
  reading-edit distances. The repo does not claim any stroke-geometry metric here.
- Saved progress is also the durable source for whether a kanji has been seen before and whether it already consumed one of today's local new-item slots.
- Saved progress now also carries the explicit review-bank boundary: a kanji becomes a persistent review-bank candidate the first time a `Good` finishes a faded step onto `0%`.
- Saved progress now also carries a small repeated-miss signal for already-graduated review-bank
  items. Because explicit grading writes progress immediately, a later session started on the same
  local day can already pull those missed review cards earlier. The boost also survives to later
  local days until later successful review answers reduce it.
- Readings and meanings live in a separate details block. In recall modes they are currently hidden until reveal rather than shown as a blurred preview.
- Seen-library and manual-intake cards now use the same white-center-over-grid cue presentation as the study card, just at a smaller preview size.
- Explicit review grading writes local progress. Reveal-only actions, drill switching, and Learn-mode navigation do not persist anything.
- Explicit review grading also posts review outcomes to the backend scheduler once the locally saved
  progress record has already crossed into review-bank candidacy.
- Saved progress does not own live queue position, reveal state, attempts, or answer flow after a session starts. Learn stays full-cue and Blind recall stays cue-hidden regardless of saved progress.
- Progress confidence and review-bank membership are now separate signals: a later `Again` can drop starting cue support back to `learning` without pushing an already-graduated kanji back into unfinished-new carryover.
- The UI shows a stable deck slot within the selected 10-card batch, not completion through the session.
- The UI now also shows the current batch mix and today's remaining fresh-new allowance so the
  local rules are legible instead of hidden behind the shell.
- A separate seen-library view lists only kanji that durable learner progress has already marked as
  seen, alongside each item's stable grid, meanings, and on/kun readings.
- A manual-intake view lists not-yet-seen kanji with meanings and readings and can explicitly add
  one to durable learner progress so later study flows treat it as encountered.

## Current Scope

- Stable content ownership remains separate from live session behavior and separate again from durable progress.
- The app deck now comes from a full canonical Joyo import manifest. Mock data remains fixture data only.
- The queue inside the current review shell is intentionally simple rotation within the selected 10-card session.
- This is still a narrow one-learner app, not a sync-enabled study platform or broad hosted system.

## Not Built Yet

- No production-ready spaced-repetition platform, auth layer, or cloud account system.
- The only daily pacing rule landed so far is the explicit local-first cap of 5 truly new kanji per day at session creation time.
- No within-session weighted requeue based on repeated misses. `Again` still changes cue opacity,
  but the queue still rotates simply once a session has started.
- No scheduler-driven live queue ownership after a session starts. Due selection is backend-backed,
  but the active run still rotates locally.
- No cross-device sync, canonical content hosting, or production database.
- No broader post-MVP content expansion beyond the current full Joyo plus full Jinmeiyo deck.

## Resume Map

Start here when reopening the repo:

- [`src/pages/StudyPage.tsx`](src/pages/StudyPage.tsx): current study shell behavior and drill switching.
- [`src/pages/SeenLibraryPage.tsx`](src/pages/SeenLibraryPage.tsx): learner-facing seen-library view sourced from durable progress plus canonical deck entries.
- [`src/pages/ManualSeenIntakePage.tsx`](src/pages/ManualSeenIntakePage.tsx): explicit local intake surface for marking outside encounters as seen.
- [`src/data/canonicalDeck.ts`](src/data/canonicalDeck.ts): real deck manifest, canonical source-set versions, Joyo-first overlap policy, and stable `KanjiEntry` materialization.
- [`src/data/canonicalSources/joyo/kanjidic2_2026_112.ts`](src/data/canonicalSources/joyo/kanjidic2_2026_112.ts): full imported Joyo source records plus provenance and normalization metadata.
- [`src/data/canonicalSources/jinmeiyo/kanjidic2_2026_112.ts`](src/data/canonicalSources/jinmeiyo/kanjidic2_2026_112.ts): full imported Jinmeiyo source records with their own provenance and normalization metadata.
- [`src/data/mockKanji.ts`](src/data/mockKanji.ts): development-only mock fixture data and its separate assignment/source versions.
- [`src/domain/session/session.ts`](src/domain/session/session.ts): session creation, queue movement, and cue opacity rules.
- [`src/domain/progress/seenLibrary.ts`](src/domain/progress/seenLibrary.ts): pure selector that turns durable progress plus canonical entries into read-only seen-library items.
- [`src/domain/progress/manualSeenIntake.ts`](src/domain/progress/manualSeenIntake.ts): pure selector for not-yet-seen intake candidates.
- [`src/state/progressStore.ts`](src/state/progressStore.ts): local progress load/save boundary.
- [`src/domain/progress/progress.ts`](src/domain/progress/progress.ts): minimal progress updates plus the durable carryover-versus-review-bank boundary and recent-miss review priority signal.
- [`tests/StudyPage.test.tsx`](tests/StudyPage.test.tsx): expected UI behavior for the shell.
- [`tests/session.test.ts`](tests/session.test.ts): expected session-domain behavior.
- [`docs/product.md`](docs/product.md): product intent to preserve.
- [`docs/architecture.md`](docs/architecture.md): ownership boundaries to preserve.
- [`docs/worktrees.md`](docs/worktrees.md): planned worktree sequence.

## After This Audit

The original local-first MVP plan and the numbered worktree follow-ons in
[`docs/worktrees.md`](docs/worktrees.md) are complete.

## Remaining Numbered Worktrees

The remaining numbered worktree plan is complete.

## Real Data And Saved State

- Full real `joyo` content now lives in the app deck through an explicit imported source-set version.
- The current Joyo source-set version is `joyo-kanjidic2-2026-112`, with upstream/license details
  recorded beside the imported source file.
- `jinmeiyo` now has an explicit full imported supplemental source path at
  `jinmeiyo-kanjidic2-2026-112`, kept separate from Joyo ownership.
- The current real deck is the 2136-entry Joyo import plus the full 863-entry Jinmeiyo import,
  for 2999 total canonical entries materialized from versioned in-repo source files and manifests.
- Local learner progress is already saved today through localStorage after explicit review grading.
- That current save path is intentionally small: it is not session restore, cross-device sync, or
  hosted learner-progress replacement.
- Local learner progress now also records when a kanji was first seen so session creation can apply
  a local daily cap for truly new items without moving live session state into progress.
- Local learner progress now also records whether a kanji has graduated out of the unfinished
  new-item path into the first durable review-bank candidate pool.
- Local learner progress now also records a small recent failed-recall signal for already-graduated
  review-bank items so later local sessions can choose those review cards earlier without adding
  due dates.
- The repo now also includes a small file-backed backend scheduler that owns only due dates,
  interval lengths, and review counts for review-bank scheduling.
- The app now also includes a readings-to-kanji multiple-choice drill whose distractors come from
  normalized reading edit distance over repo-local on/kun data.
- [`docs/progress-sync-file-exchange.md`](docs/progress-sync-file-exchange.md) now records the
  post-MVP decision for portable learner state while staying local-first and account-free.
- [`docs/api-boundary-review.md`](docs/api-boundary-review.md) now survives as historical context
  for why the repo delayed backend work until the scheduler boundary could stay narrow.
- The app now includes a learner-facing seen library built from durable progress plus stable
  canonical content.
- The app now also includes manual seen intake for explicitly adding outside encounters to durable
  learner progress without moving stable content or live session state out of their current
  ownership boundaries.
