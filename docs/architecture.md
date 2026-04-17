# Architecture

The scaffold separates stable content, session behavior, and rendering.

## Stable Content

`KanjiEntry` stores facts about a kanji and its assigned code. It must not store render opacity, current success streak, or session-specific learning state.

## Session Behavior

`SessionState` tracks ephemeral state for the current drill run. For example, a "Random 10; dim on success" session can lower cue opacity after a correct answer without mutating the kanji record.

## Rendering

React components receive stable code digits plus an opacity value. This keeps cue fading testable and makes it possible to render the same kanji differently in two drills.

## Module Boundaries

- `domain/encoding`: base-8 code assignment and palette rules
- `domain/drills`: drill mode configuration and placeholders for queues
- `domain/session`: ephemeral per-run state and cue opacity behavior
- `domain/progress`: persistent learner progress types
- `components`: presentational React components
- `pages`: screen composition
- `lib`: infrastructure helpers

TODO: Add a real app state provider only after local component state becomes awkward.
