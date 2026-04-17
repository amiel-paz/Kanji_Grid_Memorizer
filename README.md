# Kanji Grid Memorizer

A personal React/TypeScript app for learning Japanese kanji with a stable visual encoding system.

Each kanji receives a deterministic 2x2 color grid. The four quadrants are always ordered top-left, top-right, bottom-left, bottom-right. Each quadrant stores one base-8 digit, giving 4096 possible visual codes.

The important product idea is not "flashcards with colors." It is a stable visual codebook plus drill-configurable cue fading. A kanji owns its stable code digits, while opacity is always derived at render time from drill, session, or progress state.

## Version 1 Deliverable

This scaffold is intentionally small:

- React + TypeScript + Vite app shell
- Tailwind-ready CSS entry point
- mock local kanji records
- core domain types
- deterministic assignment utility interface
- reusable 2x2 color tile renderer
- minimal study screen with drill mode switching
- localStorage persistence wrapper
- starter tests for code formatting, tile validation, and session opacity behavior

## Architecture

- `src/domain` owns product concepts and logic that should not depend on React.
- `src/components` owns reusable UI pieces.
- `src/pages` composes UI into screens.
- `src/data` contains local mock records for now.
- `src/lib` contains infrastructure helpers such as persistence.
- `src/state` is reserved for app-level state once React state/context becomes too cramped.

## Worktree Planning

This project is intended to move forward through small, focused worktrees. Use
[`docs/worktrees.md`](docs/worktrees.md) as the canonical task list when choosing the next
worktree to create.

## Intentionally Not Implemented Yet

- full official Joyo kanji import
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

TODO: Replace the mock dataset with a canonical, versioned Joyo source pipeline before treating assignments as production data.
