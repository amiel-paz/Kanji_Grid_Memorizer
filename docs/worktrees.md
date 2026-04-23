# Worktree Plan

This project should move forward through small, focused worktrees. Each worktree should answer
one clear question and leave the main app in a reviewable state.

Use the naming convention:

```text
work/<area>-<short-task>
```

Examples:

```text
work/tooling-bootstrap
work/domain-palette-rules
work/session-opacity-policy
```

Avoid broad names such as `work/drills-v1`, `work/app-complete`, or `work/progress-system`.

## Suggested Order

| Order | Worktree Name | Goal | Deliverable |
| ---: | --- | --- | --- |
| 1 | `work/tooling-bootstrap` | Confirm the app installs, builds, tests, and lints cleanly. | Working `npm install`, `npm run dev`, `npm test`, `npm run build`, plus config fixes. |
| 2 | `work/docs-product-pass` | Refine product docs in the owner's words. | README and docs that match the intended product before code grows around fuzzy assumptions. |
| 3 | `work/design-system-basics` | Establish simple UI conventions. | Basic typography, spacing, buttons, form controls, and page layout rules. |
| 4 | `work/domain-types-review` | Revisit the core TypeScript types. | Clean `KanjiEntry`, `UserProgress`, `DrillConfig`, `SessionState`, and `AssignmentVersion` types. |
| 5 | `work/domain-palette-rules` | Lock down base-8 color rules. | Palette constants, digit validation, formatting helpers, and tests. |
| 6 | `work/domain-assignment-v1` | Define the placeholder deterministic assignment algorithm. | Documented deterministic strategy with assignment versioning and tests. |
| 7 | `work/domain-source-sets` | Prepare for Joyo first, Jinmeiyo later. | Source-set modeling and TODO docs for future canonical import. No importer yet. |
| 8 | `work/data-mock-deck` | Make the mock dataset useful for development. | 10-20 hand-curated mock entries with realistic readings, meanings, and tags. |
| 9 | `work/data-validation-lite` | Add basic checks around local data. | Small validation helpers for malformed code digits or missing fields. |
| 10 | `work/data-fixture-tests` | Protect mock data from obvious mistakes. | Tests proving mock entries have valid code digits and assignment version IDs. |
| 11 | `work/ui-study-shell` | Build the first usable study surface without adding new behavior. | Kanji tile/card, drill picker, and page layout wired to existing local state, with focused component/page tests. |
| 12 | `work/drill-review-shells` | Make Learn, Faded recall, and Blind recall usable in the shell. | Mode-specific reveal/readings/actions behavior that still delegates cue state to the session domain. |
| 13 | `work/session-review-loop` | Make the starter review loop explicit and testable. | Session creation, initial opacity, answer events, and simple queue advancement in one domain pass. |
| 14 | `work/session-random-10` | Implement the first real drill-shaping behavior. | Select 10 random kanji for a session, with deterministic test hooks. |
| 15 | `work/persistence-local-store` | Harden the localStorage wrapper. | Safe load/save/clear behavior, error handling, and tests. |
| 16 | `work/progress-model-v1` | Decide minimum useful progress. | `UserProgress` update helpers for seen/correct/confidence, plus draft status rules that can later distinguish new, carryover, and review-bank items. |
| 17 | `work/progress-local-sync` | Persist progress only after review interactions need it. | Lightweight app-level progress wiring plus session-answer updates to local progress, establishing the first permanent learner record. |
| 18 | `work/tests-core-coverage` | Cover important pure and component behavior not already protected nearby. | Encoding, assignment, session, progress, tile/card/picker, and study smoke tests where gaps remain. |
| 19 | `work/tests-regression-todos` | Convert important TODO assumptions into tests. | Tests for opacity not being stored on kanji, valid codes, and similar invariants. |
| 20 | `work/v1-polish-pass` | Make the shell feel coherent without changing core behavior. | Copy, basic accessibility, and responsive layout fixes scoped to the existing v1 shell. |
| 21 | `work/v1-readme-runbook` | Make the project easy to resume. | README has setup, scripts, architecture, and next-task suggestions. |
| 22 | `work/v1-final-audit` | Review scope creep and remove accidental false completeness. | Clean v1 scaffold that still leaves real learning work to the project owner. |
| 23 | `work/data-canonical-joyo-import-full` | Replace the tiny canonical slice with the full real Joyo deck. | Explicit Joyo source file(s), provenance/version metadata, stable `KanjiEntry` materialization, and tests proving the app is no longer running on a tiny hand-entered subset. |
| 24 | `work/data-canonical-jinmeiyo-import` | Add Jinmeiyo as a second explicit source path without reclassifying Joyo-owned kanji. | Small real-data Jinmeiyo source file(s), source-set versioning, Joyo-first overlap handling, and a union manifest that keeps common-use ownership stable. |
| 25 | `work/progress-session-seeding-v1` | Let durable learner progress shape a new session without breaking ownership boundaries. | Session creation can read saved progress to choose initial cue state and selection inputs while session state still owns live per-run behavior. |
| 26 | `work/progress-daily-new-limit` | Make the first daily study allowance explicit. | A local-first daily cap for new kanji, wired into session creation and tested without adding cloud/backend work. |
| 27 | `work/progress-carryover-v1` | Avoid silently dropping unfinished new items. | Carryover rules that re-offer started-but-unfinished kanji before introducing replacements on a later day. |
| 28 | `work/review-bank-v1` | Create the first durable review pool for graduated items. | Progress-derived review-bank records and selection helpers that preserve the content-versus-progress boundary. |
| 29 | `work/review-session-orchestration` | Turn the shell into a coherent daily study loop. | One app-level local study flow that can mix due review items with today's new-item allowance and carryover, without adding backend or sync work. |
| 30 | `work/local-mvp-polish` | Make the local-first study loop comfortable enough to use daily. | Empty states, settings/copy clarity, responsiveness, accessibility, and UX cleanup scoped to the real-data local MVP. |
| 31 | `work/local-mvp-ship-audit` | End on an honest MVP you'd be willing to ship to yourself or a friend. | Final regression pass, README/runbook updates, scope audit, and a clean stop point for the first truly usable local release. |
| 32 | `work/progress-sync-file-exchange` | Plan a serverless multi-device path after the local MVP is already useful. | Decision doc plus file-format spec for per-device learner-state exchange, including event-log shape, device IDs, schema versioning, import/export or shared-folder merge rules, and explicit preservation of the stable-content versus learner-state boundary. No cloud account system or backend implementation. |
| 33 | `work/api-boundary-review` | Revisit whether the app needs REST or another backend boundary only after the local MVP proves itself. | Decision doc only: current local-first posture, triggers for REST/API work, candidate resources, and boundaries to preserve. No backend implementation. |
| 34 | `work/progress-seen-library` | Add a learner-facing browser for kanji already encountered. | A local page or panel that lists seen kanji with their stable grids and meanings, sourced from durable learner progress without moving live session state into content or progress. |
| 35 | `work/progress-manual-seen-intake` | Let the learner mark a not-yet-seen kanji as encountered outside the app. | A local unlearned-kanji browser with an explicit action to create or update durable learner progress so those kanji can enter future study flows, without mutating stable `KanjiEntry` ownership. |

Treat row 22 as the stopping point for the current v1 shell. Rows 23 through 31 are the planned
path from honest shell to shippable local-first MVP. Rows 32 and 33 are intentionally post-MVP
follow-on tracks, not implied scope to absorb into the first usable release.

At this point the remaining numbered worktrees are:

- `work/progress-daily-new-limit`
- `work/progress-carryover-v1`
- `work/review-bank-v1`
- `work/review-session-orchestration`
- `work/local-mvp-polish`
- `work/local-mvp-ship-audit`
- `work/progress-sync-file-exchange`
- `work/api-boundary-review`
- `work/progress-seen-library`
- `work/progress-manual-seen-intake`

Clarify the saved-state milestone boundaries:

- Row 17 already introduced local progress persistence after explicit review grading.
- Row 23 is where the full real `joyo` deck replaces the old tiny canonical slice.
- Row 24 landed a small real-data `jinmeiyo` supplemental import path without reclassifying
  Joyo-owned entries.
- Row 25 lets durable progress seed the starting cue support for a new session while still leaving
  live session opacity, reveal state, attempts, and queue behavior with session ownership.
- Rows 26 through 29 are where the first actually useful daily study loop becomes concrete while
  still preserving stable content ownership versus session ownership versus durable learner state.
- Row 31 is the intended local-first MVP stop point for something you'd be willing to ship to
  yourself or a friend.
- Row 32 is for portable learner-state exchange across devices after the local MVP is already
  useful, not backend/cloud persistence.
- Row 33 is a later decision review about whether an API boundary is needed at all, not a
  commitment to build one.
- Rows 34 and 35 are learner-library follow-ons: they expose durable learner progress in the UI and
  allow explicit manual intake of encountered kanji, but they should still leave stable content
  ownership with `KanjiEntry` and live drill behavior with session state.

## Long-Term Study Loop Notes

The current v1 shell intentionally stops short of an actually useful daily system, but the planned
remaining worktrees should now reach one without changing the ownership boundaries.

What the product should build toward on the path to the first local MVP:

- Persistent progress that survives refreshes and browser restarts.
- A daily cap of `N` new kanji introduced per day.
- Carryover for unfinished new kanji, so if only `M` of `N` new items are actually learned, the
  remaining `N - M` are offered again before introducing replacements.
- Promotion from "new" into a persistent review bank after the learner successfully moves through
  the full cue-opacity ladder for that item.
- Review sessions that can mix due review items with the day's new-item allowance without
  rewriting stable content records.

Suggested follow-on worktrees after the current v1 scaffold:

- `work/progress-daily-new-limit`: decide the daily new-item allowance.
- `work/progress-carryover-v1`: keep unfinished new items from being silently dropped.
- `work/review-bank-v1`: create the first durable review pool for graduated items.
- `work/review-session-orchestration`: turn the separate parts into one coherent daily local study
  loop.
- `work/local-mvp-polish`: make the loop pleasant and legible enough for daily personal use.
- `work/local-mvp-ship-audit`: stop on an honest local MVP.

Suggested post-MVP follow-on worktrees:

- `work/progress-sync-file-exchange`: define a file-based, account-free path for moving learner
  state across personal devices, ideally through versioned per-device event logs rather than raw
  merged counters.
- `work/api-boundary-review`: revisit whether any backend or API work is justified only after the
  local-first MVP proves its value.
- `work/progress-seen-library`: add a place to browse all learner-seen kanji with their grids and
  meanings using durable progress plus stable content records.
- `work/progress-manual-seen-intake`: add a place to browse not-yet-seen kanji and explicitly
  mark one as encountered so it enters later learner-state-driven study flows.

Keep the mastery rule product-specific:

- This app does not need to copy Anki's "two correct answers" threshold directly.
- A better project-native rule is that an item graduates from the new-item path after the learner
  completes the cue-opacity ladder down to `0%` under the intended drill flow.
- Session state still owns live opacity during a run; persistent progress only stores the durable
  outcome needed to shape future sessions.

## First Batch

Start here unless there is a strong reason to do otherwise:

1. `work/tooling-bootstrap`
2. `work/docs-product-pass`
3. `work/domain-types-review`
4. `work/domain-palette-rules`
5. `work/ui-study-shell`

## Worktree Checklist

Before creating a worktree:

1. Pick one row from this document.
2. Confirm the goal can be reviewed independently.
3. Keep the write scope narrow.
4. Leave TODOs for adjacent work instead of absorbing it.

When finishing a worktree:

1. Run the relevant tests and checks if tooling is available.
2. Update docs if the task changed architecture or product intent.
3. Summarize what moved forward and what should remain for later worktrees.

## Consolidation Guidance

Prefer one reviewable worktree for tightly coupled UI or domain behavior, even if the implementation
touches several small files. A worktree is too small when its only deliverable is a component or
helper that cannot be meaningfully exercised without the next planned worktree.

Good candidates to combine:

- Presentational study shell pieces that are reviewed together, such as tile/card/picker/layout.
- Drill mode shells that share the same page state and controls.
- Session helpers that form one review loop, such as creation, answer events, opacity changes, and
  basic queue advancement.
- Polish passes where copy, accessibility, and responsive fixes are small and touch the same shell.

Keep worktrees separate when they change a different contract or introduce a behavior that deserves
its own tests and review, such as randomized session selection, persistence boundaries, progress
modeling, or a future canonical import pipeline.

Do not add REST, GraphQL, RPC, or backend service work as part of the local MVP path unless a later
decision worktree says the product needs it. The planned `work/api-boundary-review` worktree should
revisit that question only after real data, local progress shaping, and the first useful daily
study loop are concrete.
