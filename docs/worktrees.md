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
| 23 | `work/data-canonical-joyo-jinmeiyo-import` | Replace fixture-only deck ownership with a versioned canonical source pipeline. | Import real Joyo and Jinmeiyo data under explicit provenance, keep Joyo-first ownership, define the union manifest, and materialize stable `KanjiEntry` records without adding learner progress or scheduling behavior. |
| 24 | `work/progress-sync-file-exchange` | Plan a serverless multi-device path without changing the MVP into an online app. | Decision doc plus file-format spec for per-device learner-state exchange, including event-log shape, device IDs, schema versioning, import/export or shared-folder merge rules, and explicit preservation of the stable-content versus learner-state boundary. No cloud account system or backend implementation. |
| 25 | `work/api-boundary-review` | Revisit whether the app needs REST or another backend boundary. | Decision doc only: current local-first posture, triggers for REST/API work, candidate resources, and boundaries to preserve. No backend implementation. |

Treat row 22 as the stopping point for the current v1 shell. Rows 23 and beyond are intentionally
separate follow-on tracks, not implied scope to absorb into the audit.

At this point the remaining numbered worktrees are only:

- `work/data-canonical-joyo-jinmeiyo-import`
- `work/progress-sync-file-exchange`
- `work/api-boundary-review`

Clarify the saved-state milestone boundaries:

- Row 17 already introduced local progress persistence after explicit review grading.
- Row 23 is where real `joyo` and `jinmeiyo` source data should replace fixture-only deck content.
- Row 24 is for portable local-first learner-state exchange across devices, not backend/cloud
  persistence.
- Row 25 is a decision review about whether an API boundary is needed later, not a commitment to
  build one.

## Long-Term Study Loop Notes

The current worktree sequence intentionally stops short of an Anki-like daily system, but the
planned architecture should support that direction without changing the ownership boundaries.

What the product should build toward after the current v1 scaffold:

- Persistent progress that survives refreshes and browser restarts.
- A daily cap of `N` new kanji introduced per day.
- Carryover for unfinished new kanji, so if only `M` of `N` new items are actually learned, the
  remaining `N - M` are offered again before introducing replacements.
- Promotion from "new" into a persistent review bank after the learner successfully moves through
  the full cue-opacity ladder for that item.
- Review sessions that can mix due review items with the day's new-item allowance without
  rewriting stable content records.

Suggested follow-on worktrees after the current v1 scaffold:

- `work/data-canonical-joyo-jinmeiyo-import`: replace the fixture-only deck with a versioned
  canonical import pipeline for real Joyo and Jinmeiyo data, preserving Joyo-first ownership and
  keeping stable content separate from learner state.

Suggested follow-on worktrees after the plan reaches persistent progress:

- `work/progress-sync-file-exchange`: define a file-based, account-free path for moving learner
  state across personal devices, ideally through versioned per-device event logs rather than raw
  merged counters.
- `work/progress-daily-new-limit`: choose today's new-kanji allowance, track carryover, and avoid
  silently dropping unfinished new items.
- `work/review-bank-v1`: store mastered items in a durable recall pool that future drills can
  revisit.

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

Do not add REST, GraphQL, RPC, or backend service work as part of the v1 scaffold unless a later
decision worktree says the product needs it. The planned `work/api-boundary-review` worktree should
revisit that question after local progress, persistence, and the first review loop are concrete.
