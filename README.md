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
- A full real Joyo canonical deck materialized from explicit in-repo source inputs.
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
- A fresh session selects 10 unique kanji from the canonical Joyo deck and keeps that selected set stable for the run.
- Switching drills recreates the session for the chosen mode and resets reveal state. Live cue opacity does not carry across drill switches.
- Learn keeps the full cue, meanings, onyomi, and kunyomi visible and uses `Next kanji` to move through the current session without grading.
- Faded recall uses a reveal-first review loop: try recall, reveal readings and meanings, then grade with `Again` or `Good`.
- Blind recall uses the same reveal-first flow, but the cue stays hidden at `0%` before and after grading.
- In Faded recall, cue opacity is session-owned and follows the ladder `100% -> 66% -> 33% -> 0%` on `Good`. `Again` raises it one step.
- Readings and meanings live in a separate details block. In recall modes they are currently hidden until reveal rather than shown as a blurred preview.
- Explicit review grading writes local progress. Reveal-only actions, drill switching, and Learn-mode navigation do not persist anything.
- Saved progress is loaded from localStorage, but it does not currently seed a new session's live cue opacity or queue.
- Progress confidence becomes `familiar` only when a `Good` completes a faded step onto `0%`. An `Again` drops `familiar` back to `learning`.
- The UI shows a stable deck slot within the selected 10-card batch, not completion through the session.

## Current Scope

- Stable content ownership remains separate from live session behavior and separate again from durable progress.
- The app deck now comes from a full canonical Joyo import manifest. Mock data remains fixture data only.
- The queue inside the current review shell is intentionally simple rotation within the selected 10-card session.
- The current shell is good for validating UI flow and ownership boundaries, not for judging the eventual learning system.

## Not Built Yet

- No due-card logic, daily-new behavior, carryover, review-bank behavior, or orchestration layer.
- No weighted requeue based on repeated misses. `Again` changes cue opacity, but the queue still rotates simply.
- No removal from the current recall batch after a successful zero-cue pass. Cards stay in the session queue for the rest of the run.
- No backend, API, auth, sync, or cloud persistence.
- No Jinmeiyo coverage yet beyond the explicit empty reservation path and separate future import worktree.

## Resume Map

Start here when reopening the repo:

- [`src/pages/StudyPage.tsx`](src/pages/StudyPage.tsx): current study shell behavior and drill switching.
- [`src/data/canonicalDeck.ts`](src/data/canonicalDeck.ts): real deck manifest, canonical source-set versions, and stable `KanjiEntry` materialization.
- [`src/data/canonicalSources/joyo/kanjidic2_2026_112.ts`](src/data/canonicalSources/joyo/kanjidic2_2026_112.ts): full imported Joyo source records plus provenance and normalization metadata.
- [`src/data/mockKanji.ts`](src/data/mockKanji.ts): development-only mock fixture data and its separate assignment/source versions.
- [`src/domain/session/session.ts`](src/domain/session/session.ts): session creation, queue movement, and cue opacity rules.
- [`src/state/progressStore.ts`](src/state/progressStore.ts): local progress load/save boundary.
- [`src/domain/progress/progress.ts`](src/domain/progress/progress.ts): minimal progress updates and `familiar` transition rules.
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

- `work/data-canonical-jinmeiyo-import`
- `work/progress-session-seeding-v1`
- `work/progress-daily-new-limit`
- `work/progress-carryover-v1`
- `work/review-bank-v1`
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
- `jinmeiyo` follows at `work/data-canonical-jinmeiyo-import` under the same explicit source-set
  and assignment-version model.
- The current real deck is the full 2136-entry Joyo import materialized from a versioned in-repo
  source file and manifest.
- Local learner progress is already saved today through localStorage after explicit review grading.
- That current save path is intentionally small: it is not session restore, cross-device sync, or
  backend-backed production persistence.
- The next planned progress worktrees are about shaping local sessions from saved state into a real
  daily learning loop before sync is considered.
- `work/progress-sync-file-exchange` is a post-MVP step for portable learner state while staying
  local-first and account-free.
- `work/api-boundary-review` is only a later decision point about whether any backend or API work
  is warranted at all.
