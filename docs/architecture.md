# Architecture

The app separates stable content, session behavior, and rendering. That separation is the
main architectural decision in the product.

## Stable Content

`KanjiEntry` stores facts about a kanji and its assigned code. It must not store render opacity,
current success streak, queue position, or session-specific learning state.

Stable content should be safe to load from a future canonical source file without carrying
personal study history along with it.

Content types live in `src/domain/content/types.ts`.

Source-set ownership also lives with stable content. `mock-joyo` is development fixture data only,
while `joyo` is now the real full canonical deck path and `jinmeiyo` is a full real supplemental
source path. Mock entries may be useful and realistic, but they should not become the canonical
deck by accident. Canonical imports should live in explicit versioned source files plus import
manifests, and they should apply Joyo-first ownership before adding Jinmeiyo so name-use expansion
cannot reclassify common-use entries silently.

## Session Behavior

`SessionState` tracks ephemeral state for the current drill run. For example, a "Random 10; dim on
success" session can lower cue opacity after a correct answer without mutating the kanji record.

Session code can be simple at first. It should still make the ownership boundary obvious: a drill
may decide what happens next, but it does not rewrite the deck.

The current queue is intentionally simple rotation within one selected session batch. A review
answer moves the active item to the back; it does not hand live queue ownership to the server.
New session creation may still use saved progress to shape which kanji enter a selected batch and
cap how many truly new kanji can enter that day's batch while carrying unfinished new-path items
forward before fresh replacements. The review-bank slice is now narrower: carryover and fresh-new
selection stay local, but due review-bank picks can come from the backend scheduler. If that
backend is unavailable, the app falls back to the older local recent-miss heuristic and labels it
explicitly. Queue position, reveal state, attempts, answer flow, and post-start opacity changes
stay session-owned.

Session types live in `src/domain/session/types.ts`.

## Persistent Progress

`UserProgress` is the long-lived learner record. It can eventually summarize outcomes across
sessions, but it should stay smaller than a scheduler until the app has a real learning loop.

In the current MVP, progress shapes only the session-creation boundary for truly new, unfinished
carryover, review-bank candidacy, and a small recent-miss fallback signal for already graduated
review-bank items.
That same durable boundary can also drive learner-library views and explicit manual-intake writes.
It still does not store live session opacity, queue position, reveal state, or active attempts.

Progress types live in `src/domain/progress/types.ts`.

## Hosted Scheduler

The repo now also has a separate backend scheduler pass under `server/src`. That server owns only
durable hosted due records and scheduling intervals for a learner. It should not take over stable
content ownership from `KanjiEntry`, and it should not take over live queue/reveal/cue behavior
from session state.

That means the backend may decide when a kanji is due again, but the client session still decides
what happens inside an active run.

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
the primary action. In the current local MVP, review answers usually rotate the queue, but a clean
zero-cue pass retires that card from the rest of the current run. Drill logic still only decides
cue support and retirement inside session state; it does not rewrite stable content or durable
progress ownership.

The Reading MCQ drill keeps its live answer options in session state too. Stable `KanjiEntry`
records still own the readings, meanings, and code digits, while the session owns which four kanji
choices are currently attached to a prompt.

## Module Boundaries

- `domain/encoding`: base-8 code assignment and palette rules
- `domain/content`: stable kanji records, source-set ownership, and assignment version contracts
- `domain/drills`: drill mode configuration and placeholders for queues
- `domain/session`: ephemeral per-run state and cue opacity behavior
- `domain/progress`: persistent learner progress types
- `server`: hosted scheduling API, file-backed learner review records, and due-plan generation
- `components`: presentational React components
- `pages`: screen composition
- `lib`: infrastructure helpers

## Working Agreement

- Keep product logic in `src/domain` when it can be tested without React.
- Keep mock data honest: useful for development, not canonical product truth.
- Add state providers only when props or local state become awkward in real flows.
- Prefer small notes at ownership boundaries over broad placeholder systems.

If local component state becomes awkward later, add a small app state provider then rather than
pretending one is needed already.
