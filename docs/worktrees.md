# Worktree Plan

This project should move forward through small, focused worktrees. Each worktree should answer
one clear question and leave the main app in a reviewable state.

Use the naming convention:

```text
kgm/<area>-<short-task>
```

Examples:

```text
kgm/tooling-bootstrap
kgm/domain-palette-rules
kgm/session-opacity-policy
```

Avoid broad names such as `kgm/drills-v1`, `kgm/app-complete`, or `kgm/progress-system`.

## Suggested Order

| Order | Worktree Name | Goal | Deliverable |
| ---: | --- | --- | --- |
| 1 | `kgm/tooling-bootstrap` | Confirm the app installs, builds, tests, and lints cleanly. | Working `npm install`, `npm run dev`, `npm test`, `npm run build`, plus config fixes. |
| 2 | `kgm/docs-product-pass` | Refine product docs in the owner's words. | README and docs that match the intended product before code grows around fuzzy assumptions. |
| 3 | `kgm/design-system-basics` | Establish simple UI conventions. | Basic typography, spacing, buttons, form controls, and page layout rules. |
| 4 | `kgm/domain-types-review` | Revisit the core TypeScript types. | Clean `KanjiEntry`, `UserProgress`, `DrillConfig`, `SessionState`, and `AssignmentVersion` types. |
| 5 | `kgm/domain-palette-rules` | Lock down base-8 color rules. | Palette constants, digit validation, formatting helpers, and tests. |
| 6 | `kgm/domain-assignment-v1` | Define the placeholder deterministic assignment algorithm. | Documented deterministic strategy with assignment versioning and tests. |
| 7 | `kgm/domain-source-sets` | Prepare for Joyo first, Jinmeiyo later. | Source-set modeling and TODO docs for future canonical import. No importer yet. |
| 8 | `kgm/data-mock-deck` | Make the mock dataset useful for development. | 10-20 hand-curated mock entries with realistic readings, meanings, and tags. |
| 9 | `kgm/data-validation-lite` | Add basic checks around local data. | Small validation helpers for malformed code digits or missing fields. |
| 10 | `kgm/data-fixture-tests` | Protect mock data from obvious mistakes. | Tests proving mock entries have valid code digits and assignment version IDs. |
| 11 | `kgm/ui-kanji-tile` | Improve the 2x2 grid renderer. | Stable tile component with size options, opacity validation, accessible labeling, and tests. |
| 12 | `kgm/ui-kanji-card` | Create a small kanji display component. | Presentational card that shows kanji, grid, meanings, and readings depending on props. |
| 13 | `kgm/ui-drill-picker` | Make drill mode switching clean and obvious. | Drill selector component wired to local state. |
| 14 | `kgm/ui-study-layout` | Shape the main study screen. | Legible study page shell that can host different drill modes. |
| 15 | `kgm/drill-learn-shell` | Build the Learn mode starter. | Shows kanji, full cue, readings, and meanings. |
| 16 | `kgm/drill-recognize-shell` | Build Recognize from grid placeholder. | Shows grid and mock answer choices, with TODOs for real answer handling. |
| 17 | `kgm/drill-match-shell` | Build Match grid to kanji placeholder. | Shows kanji and mock grid choices. |
| 18 | `kgm/drill-faded-recall-shell` | Build faded recall starter. | Shows kanji with opacity from session state. |
| 19 | `kgm/drill-blind-recall-shell` | Build blind recall starter. | Shows kanji without cue support. |
| 20 | `kgm/session-create-flow` | Make session creation explicit. | Helper for creating a session from deck plus drill config. |
| 21 | `kgm/session-opacity-policy` | Isolate cue opacity behavior. | Functions for initial opacity, correct-answer dimming, miss recovery, and tests. |
| 22 | `kgm/session-random-10` | Implement the first real drill-shaping behavior. | Select 10 random kanji for a session, with deterministic test hooks. |
| 23 | `kgm/session-basic-queue` | Add simple queue progression. | Move between items without advanced scheduling. |
| 24 | `kgm/session-answer-events` | Model answer submission. | Small answer event/update API that updates session state. |
| 25 | `kgm/persistence-local-store` | Harden the localStorage wrapper. | Safe load/save/clear behavior, error handling, and tests. |
| 26 | `kgm/progress-model-v1` | Decide minimum useful progress. | `UserProgress` update helpers for seen/correct/confidence. |
| 27 | `kgm/progress-local-context` | Add app-level progress state only when needed. | Lightweight React context or hook around local progress. |
| 28 | `kgm/progress-session-sync` | Persist progress after drill interactions. | Session answer results update local progress. |
| 29 | `kgm/tests-domain-core` | Cover core pure functions. | Encoding, assignment, session, and progress tests. |
| 30 | `kgm/tests-component-core` | Cover important UI behavior. | Tile, drill picker, and kanji card tests. |
| 31 | `kgm/tests-study-smoke` | Add one page-level smoke test. | Study screen renders and mode switching does not crash. |
| 32 | `kgm/tests-regression-todos` | Convert important TODO assumptions into tests. | Tests for opacity not being stored on kanji, valid codes, and similar invariants. |
| 33 | `kgm/v1-copy-pass` | Make UI text crisp and non-placeholder where appropriate. | Clear user-facing copy while preserving implementation TODOs. |
| 34 | `kgm/v1-accessibility-pass` | Basic keyboard and screen-reader sanity. | Labels, focus states, and semantic buttons/forms. |
| 35 | `kgm/v1-responsive-pass` | Make the shell usable on desktop and mobile. | No overflowing text and stable tile/card layout. |
| 36 | `kgm/v1-readme-runbook` | Make the project easy to resume. | README has setup, scripts, architecture, and next-task suggestions. |
| 37 | `kgm/v1-final-audit` | Review scope creep and remove accidental false completeness. | Clean v1 scaffold that still leaves real learning work to the project owner. |

## First Batch

Start here unless there is a strong reason to do otherwise:

1. `kgm/tooling-bootstrap`
2. `kgm/docs-product-pass`
3. `kgm/domain-types-review`
4. `kgm/domain-palette-rules`
5. `kgm/ui-kanji-tile`

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
