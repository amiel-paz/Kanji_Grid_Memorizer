# Kanji Grid Memorizer

Kanji Grid Memorizer is a local-first React/TypeScript study shell for one product idea:
each kanji owns a stable 2x2 base-8 color cue, and the active drill decides how much of
that cue to show.

This repo is currently an honest v1 shell, not a finished learning system. It is enough
to demo the cue model, the reveal-first review flow, the session ownership boundary, and
the local progress boundary without pretending that scheduling or canonical data work
already exists.

## What This Repo Is Today

- A Vite + React + TypeScript web app with a single study page.
- A Joyo-first canonical deck materialized from explicit in-repo Joyo and Jinmeiyo source inputs.
- Mock kanji fixture data kept separately for development and tests.
- Three drill shells: Learn, Faded recall, and Blind recall.
- Session-owned cue opacity and a simple rotating queue.
- Local-only progress persistence after explicit review grading.
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

Run checks:

```bash
npm test
npm run build
npm run lint
```

What each script does:

- `npm run dev`: starts the Vite dev server.
- `npm test`: runs the Vitest test suite.
- `npm run build`: runs TypeScript project build plus Vite production build.
- `npm run lint`: runs ESLint across the repo.

## Current Behavior

- The default drill is Faded recall.
- A fresh session still aims for a 10-card batch, but newly created sessions can admit only up to 5 truly new kanji per local day from durable saved progress.
- Started-but-unfinished new kanji now carry forward into later session creation before fresh replacement new kanji are admitted. Older carryover reduces that day's fresh-new allowance; same-day carryover does not double-count because `firstSeenAt` already consumed today's slot.
- Kanji that have already cleared the new-item fade ladder now persist as review-bank candidates in durable progress and can still fill the rest of the batch. If there is not enough review-bank material yet, the current app can honestly return a smaller batch instead of implying a fuller scheduler already exists.
- Switching drills recreates the session for the chosen mode and resets reveal state. Live cue opacity does not carry across drill switches.
- Learn keeps the full cue, meanings, onyomi, and kunyomi visible and uses `Next kanji` to move through the current session without grading.
- Faded recall uses a reveal-first review loop: try recall, reveal readings and meanings, then grade with `Again` or `Good`.
- Blind recall uses the same reveal-first flow, but the cue stays hidden at `0%` before and after grading.
- In Faded recall, cue opacity is session-owned and follows the ladder `100% -> 66% -> 33% -> 0%` on `Good`. `Again` raises it one step.
- Saved progress now seeds only the starting cue support for a new Faded recall session: `new` or unseen starts at `100%`, `learning` starts at `66%`, and `familiar` starts at `33%`.
- Saved progress is also the durable source for whether a kanji has been seen before and whether it already consumed one of today's local new-item slots.
- Saved progress now also carries the explicit review-bank boundary: a kanji becomes a persistent review-bank candidate the first time a `Good` finishes a faded step onto `0%`.
- Readings and meanings live in a separate details block. In recall modes they are currently hidden until reveal rather than shown as a blurred preview.
- Explicit review grading writes local progress. Reveal-only actions, drill switching, and Learn-mode navigation do not persist anything.
- Saved progress does not own live queue position, reveal state, attempts, or answer flow after a session starts. Learn stays full-cue and Blind recall stays cue-hidden regardless of saved progress.
- Progress confidence and review-bank membership are now separate signals: a later `Again` can drop starting cue support back to `learning` without pushing an already-graduated kanji back into unfinished-new carryover.
- The UI shows a stable deck slot within the selected 10-card batch, not completion through the session.

## Current Scope

- Stable content ownership remains separate from live session behavior and separate again from durable progress.
- The app deck now comes from a full canonical Joyo import manifest. Mock data remains fixture data only.
- The queue inside the current review shell is intentionally simple rotation within the selected 10-card session.
- The current shell is good for validating UI flow and ownership boundaries, not for judging the eventual learning system.

## Not Built Yet

- No due-card logic or full mixed new/review orchestration beyond the durable review-bank candidate boundary.
- The only daily pacing rule landed so far is the explicit local-first cap of 5 truly new kanji per day at session creation time.
- No weighted requeue based on repeated misses. `Again` changes cue opacity, but the queue still rotates simply.
- No due scheduling after a successful zero-cue pass beyond retiring the card for the rest of the current run and recording durable review-bank candidacy.
- No backend, API, auth, sync, or cloud persistence.
- No full Jinmeiyo import yet beyond the small explicit supplemental subset landed in this worktree.

## Resume Map

Start here when reopening the repo:

- [`src/pages/StudyPage.tsx`](src/pages/StudyPage.tsx): current study shell behavior and drill switching.
- [`src/data/canonicalDeck.ts`](src/data/canonicalDeck.ts): real deck manifest, canonical source-set versions, Joyo-first overlap policy, and stable `KanjiEntry` materialization.
- [`src/data/canonicalSources/joyo/kanjidic2_2026_112.ts`](src/data/canonicalSources/joyo/kanjidic2_2026_112.ts): full imported Joyo source records plus provenance and normalization metadata.
- [`src/data/canonicalSources/jinmeiyo/kanjidic2_2026_112_subset.ts`](src/data/canonicalSources/jinmeiyo/kanjidic2_2026_112_subset.ts): small real imported Jinmeiyo supplemental slice with its own version metadata.
- [`src/data/mockKanji.ts`](src/data/mockKanji.ts): development-only mock fixture data and its separate assignment/source versions.
- [`src/domain/session/session.ts`](src/domain/session/session.ts): session creation, queue movement, and cue opacity rules.
- [`src/state/progressStore.ts`](src/state/progressStore.ts): local progress load/save boundary.
- [`src/domain/progress/progress.ts`](src/domain/progress/progress.ts): minimal progress updates plus the durable carryover-versus-review-bank boundary.
- [`tests/StudyPage.test.tsx`](tests/StudyPage.test.tsx): expected UI behavior for the shell.
- [`tests/session.test.ts`](tests/session.test.ts): expected session-domain behavior.
- [`docs/product.md`](docs/product.md): product intent to preserve.
- [`docs/architecture.md`](docs/architecture.md): ownership boundaries to preserve.
- [`docs/worktrees.md`](docs/worktrees.md): planned worktree sequence.

## After This Audit

This pass is the intended stopping point for the current v1 shell.

Future work stays split in [`docs/worktrees.md`](docs/worktrees.md) so the repo does not imply a
single automatic next step. The remaining plan now explicitly aims at a shippable local-first MVP:
Jinmeiyo expansion, a useful daily study loop, polish, and then a ship audit before any sync or
API follow-on work.

## Remaining Numbered Worktrees

The remaining plan is now split into two stages.

Local-first MVP path:

- `work/review-session-orchestration`
- `work/local-mvp-polish`
- `work/local-mvp-ship-audit`

Post-MVP follow-ons:

- `work/progress-sync-file-exchange`
- `work/api-boundary-review`

## Real Data And Saved State

- Full real `joyo` content now lives in the app deck through an explicit imported source-set version.
- The current Joyo source-set version is `joyo-kanjidic2-2026-112`, with upstream/license details
  recorded beside the imported source file.
- `jinmeiyo` now has an explicit imported supplemental source path at
  `jinmeiyo-kanjidic2-2026-112-subset-v1`, kept separate from Joyo ownership.
- The current real deck is the 2136-entry Joyo import plus a 12-entry Jinmeiyo supplemental subset,
  both materialized from versioned in-repo source files and manifests.
- Local learner progress is already saved today through localStorage after explicit review grading.
- That current save path is intentionally small: it is not session restore, cross-device sync, or
  backend-backed production persistence.
- Local learner progress now also records when a kanji was first seen so session creation can apply
  a local daily cap for truly new items without moving live session state into progress.
- Local learner progress now also records whether a kanji has graduated out of the unfinished
  new-item path into the first durable review-bank candidate pool.
- The next planned progress worktrees are about shaping local sessions from saved state into a real
  daily learning loop before sync is considered.
- `work/progress-sync-file-exchange` is a post-MVP step for portable learner state while staying
  local-first and account-free.
- `work/api-boundary-review` is only a later decision point about whether any backend or API work
  is warranted at all.
