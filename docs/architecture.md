# Architecture

The scaffold separates stable content, session behavior, and rendering. That separation is the
main architectural decision in the product.

## Stable Content

`KanjiEntry` stores facts about a kanji and its assigned code. It must not store render opacity,
current success streak, queue position, or session-specific learning state.

Stable content should be safe to load from a future canonical source file without carrying
personal study history along with it.

## Session Behavior

`SessionState` tracks ephemeral state for the current drill run. For example, a "Random 10; dim on
success" session can lower cue opacity after a correct answer without mutating the kanji record.

Session code can be simple at first. It should still make the ownership boundary obvious: a drill
may decide what happens next, but it does not rewrite the deck.

## Persistent Progress

`UserProgress` is the long-lived learner record. It can eventually summarize outcomes across
sessions, but it should stay smaller than a scheduler until the app has a real learning loop.

## Rendering

React components receive stable code digits plus an opacity value. This keeps cue fading testable
and makes it possible to render the same kanji differently in two drills.

Presentational components should not infer drill rules. They render the code and opacity they are
given.

Kanji review cards use the assigned 2x2 color grid as the card background. The kanji sits in a
centered white field so the non-occluded color cue appears around the corners of the card. Session
opacity applies to the color grid only; the kanji and white center remain fully opaque for
legibility.

Review actions follow a simple two-button convention: `Again` is the secondary action and `Good` is
the primary action. Drill logic decides whether `Good` removes the item from rotation or lowers cue
opacity.

## Module Boundaries

- `domain/encoding`: base-8 code assignment and palette rules
- `domain/drills`: drill mode configuration and placeholders for queues
- `domain/session`: ephemeral per-run state and cue opacity behavior
- `domain/progress`: persistent learner progress types
- `components`: presentational React components
- `pages`: screen composition
- `lib`: infrastructure helpers

## Working Agreement

- Keep product logic in `src/domain` when it can be tested without React.
- Keep mock data honest: useful for development, not canonical product truth.
- Add state providers only when props or local state become awkward in real flows.
- Prefer small TODOs at ownership boundaries over broad placeholder systems.

TODO: Add a real app state provider only after local component state becomes awkward.
