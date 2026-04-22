# Kanji Grid Memorizer

Kanji Grid Memorizer is a local-first React/TypeScript study shell for one product idea:
each kanji owns a stable 2x2 base-8 color cue, and the active drill decides how much of
that cue to show.

This repo is currently a usable v1 shell, not a finished learning system. It is strong
enough to demo the cue model, the reveal-first review flow, the session ownership
boundary, and the local progress boundary without pretending that scheduling or canonical
data work already exists.

## What This Repo Is Today

- A Vite + React + TypeScript web app with a single study page.
- Mock kanji fixture data for development.
- Three drill shells: Learn, Faded recall, and Blind recall.
- Session-owned cue opacity and queue state.
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
- A fresh session selects 10 unique kanji from the mock deck and keeps that selected set stable for the run.
- Switching drills recreates the session for the chosen mode and resets reveal state. Live cue opacity does not carry across drill switches.
- Learn keeps the full cue, meanings, onyomi, and kunyomi visible and uses `Next kanji` to move through the current session without grading.
- Faded recall uses a reveal-first review loop: try recall, reveal readings and meanings, then grade with `Again` or `Good`.
- Blind recall uses the same reveal-first flow, but the cue stays hidden at `0%` before and after grading.
- In Faded recall, cue opacity is session-owned and follows the ladder `100% -> 66% -> 33% -> 0%` on `Good`. `Again` raises it one step.
- Readings and meanings live in a separate details block. In recall modes they are currently hidden until reveal rather than shown as a blurred preview.
- Explicit review grading writes local progress. Reveal-only actions, drill switching, and Learn-mode navigation do not persist anything.
- Saved progress is loaded from localStorage, but it does not currently seed a new session's live cue opacity or queue.
- Progress confidence becomes `familiar` only when a `Good` completes a faded step onto `0%`. An `Again` drops `familiar` back to `learning`.

## Current Scope

- Stable content ownership remains separate from live session behavior and separate again from durable progress.
- Mock data remains fixture data only. It is useful for the shell, but it is not the canonical deck.
- The queue inside the current review shell is intentionally simple rotation within the selected 10-card session.
- The current shell is good for validating UI flow and ownership boundaries, not for judging the eventual learning system.

## Not Built Yet

- No due-card logic, daily-new behavior, carryover, review-bank behavior, or orchestration layer.
- No weighted requeue based on repeated misses. `Again` changes cue opacity, but the queue still rotates simply.
- No removal from the current recall batch after a successful zero-cue pass. Cards stay in the session queue for the rest of the run.
- No backend, API, auth, sync, or cloud persistence.
- No canonical Joyo/Jinmeiyo import pipeline yet.

## Resume Map

Start here when reopening the repo:

- [`src/pages/StudyPage.tsx`](src/pages/StudyPage.tsx): current study shell behavior and drill switching.
- [`src/domain/session/session.ts`](src/domain/session/session.ts): session creation, queue movement, and cue opacity rules.
- [`src/state/progressStore.ts`](src/state/progressStore.ts): local progress load/save boundary.
- [`src/domain/progress/progress.ts`](src/domain/progress/progress.ts): minimal progress updates and `familiar` transition rules.
- [`tests/StudyPage.test.tsx`](tests/StudyPage.test.tsx): expected UI behavior for the shell.
- [`tests/session.test.ts`](tests/session.test.ts): expected session-domain behavior.
- [`docs/product.md`](docs/product.md): product intent to preserve.
- [`docs/architecture.md`](docs/architecture.md): ownership boundaries to preserve.
- [`docs/worktrees.md`](docs/worktrees.md): planned worktree sequence.

## Suggested Next Worktree

Per [`docs/worktrees.md`](docs/worktrees.md), the next planned worktree after this one is
`work/v1-final-audit`.

Keep that pass narrow:

- remove any remaining false completeness or accidental overclaiming
- align copy, docs, and tests with the actual v1 shell
- leave explicit TODOs where the scaffold is intentionally still thin

That audit should not absorb canonical data import work, scheduler work, backend work, or any
new product behavior.
