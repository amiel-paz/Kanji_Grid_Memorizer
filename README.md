# Kanji Grid Memorizer

Kanji Grid Memorizer is a personal React/TypeScript app for learning Japanese kanji with a
stable visual encoding system.

Each kanji receives a deterministic 2x2 color grid. The four quadrants are always ordered
top-left, top-right, bottom-left, bottom-right. Each quadrant stores one base-8 digit, giving
4096 possible visual codes.

The product idea is not "flashcards with colors." It is a stable visual codebook plus
drill-configurable cue fading. A kanji owns its code digits. A drill session decides how strongly
to show those digits.

## Product Shape

The learner starts with a strong cue, then practices with less help. Over time, the color grid
should become a bridge rather than a crutch: useful for recognition, recall, and disambiguation,
but never stored as temporary per-session data on the kanji itself.

The app should stay local-first until the learning loop proves itself. The first useful version is
allowed to be small, plain, and mock-data-driven as long as it protects the core rule: stable kanji
assignments are separate from ephemeral study behavior.

## Current Deliverable

This scaffold is intentionally small:

- React + TypeScript + Vite app shell
- Tailwind-ready CSS entry point
- small mock local kanji records
- core domain types
- deterministic assignment utility placeholder
- reusable 2x2 color tile renderer
- minimal study screen with drill mode switching
- localStorage persistence wrapper
- starter tests for code formatting, tile validation, and session opacity behavior

It is not a complete learning product yet. It is the base that future narrow worktrees can extend
without blurring product assumptions.

## Architecture

- `src/domain` owns product concepts and logic that should not depend on React.
- `src/components` owns reusable UI pieces.
- `src/pages` composes UI into screens.
- `src/data` contains local mock records for now.
- `src/lib` contains infrastructure helpers such as persistence.
- `src/state` is reserved for app-level state once React state/context becomes too cramped.

For more detail, see:

- [`docs/product.md`](docs/product.md) for product intent and scope.
- [`docs/drills.md`](docs/drills.md) for the intended study modes.
- [`docs/data-model.md`](docs/data-model.md) for stable content versus session state.
- [`docs/architecture.md`](docs/architecture.md) for module boundaries.
- [`docs/worktrees.md`](docs/worktrees.md) for the planned sequence of small worktrees.

## Worktree Planning

This project is intended to move forward through small, focused worktrees. Use
[`docs/worktrees.md`](docs/worktrees.md) as the canonical task list when choosing the next
worktree to create.

## Intentionally Not Implemented Yet

- official Joyo kanji import
- Jinmeiyo expansion
- backend or auth
- handwriting recognition
- OCR
- AI-generated mnemonics
- advanced spaced repetition
- production persistence or sync
- complete drill interaction flows

## Getting Started

```bash
npm install
npm run dev
npm test
```

Useful checks:

```bash
npm run lint
npm run build
```

TODO: Replace the mock dataset with a canonical, versioned Joyo source pipeline before treating
assignments as production data.
