# Architecture

The scaffold separates stable content, session behavior, and rendering. That separation is the
main architectural decision in the product.

## Stable Content

`KanjiEntry` stores facts about a kanji and its assigned code. It must not store render opacity,
current success streak, queue position, or session-specific learning state.

Stable content should be safe to load from a future canonical source file without carrying
personal study history along with it.

Content types live in `src/domain/content/types.ts`.

Source-set ownership also lives with stable content. `mock-joyo` is development fixture data only,
while `joyo` is now the real full canonical deck path and `jinmeiyo` is a small real supplemental
source path. Mock entries may be useful and realistic, but they should not become the canonical
deck by accident. Canonical imports should live in explicit versioned source files plus import
manifests, and they should apply Joyo-first ownership before adding Jinmeiyo so name-use expansion
cannot reclassify common-use entries silently.

## Session Behavior

`SessionState` tracks ephemeral state for the current drill run. For example, a "Random 10; dim on
success" session can lower cue opacity after a correct answer without mutating the kanji record.

Session code can be simple at first. It should still make the ownership boundary obvious: a drill
may decide what happens next, but it does not rewrite the deck.

The current v1 queue is intentionally simple rotation within one selected session batch. A review
answer moves the active item to the back; it does not shape a due queue or add broader scheduling.
New session creation may seed the starting cue for a selected kanji from saved progress and may
also cap how many truly new kanji can enter that day's batch, but queue position, reveal state,
attempts, answer flow, and post-start opacity changes stay session-owned.

Session types live in `src/domain/session/types.ts`.

## Persistent Progress

`UserProgress` is the long-lived learner record. It can eventually summarize outcomes across
sessions, but it should stay smaller than a scheduler until the app has a real learning loop.

In the current pass, progress can seed only the initial cue support of a new session and the
session-creation boundary for truly new kanji. It does not store live session opacity, queue
position, reveal state, or active attempts.

Progress types live in `src/domain/progress/types.ts`.

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
the primary action. In the current v1 shell, review answers always rotate the queue; drill logic
only decides whether visible cue support stays full, fades, or remains hidden.

## Module Boundaries

- `domain/encoding`: base-8 code assignment and palette rules
- `domain/content`: stable kanji records, source-set ownership, and assignment version contracts
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

If local component state becomes awkward later, add a small app state provider then rather than
pretending one is needed already.
