# Data Model

The data model exists to keep stable kanji facts separate from changing learner state.

## KanjiEntry

Owned by `src/domain/content/types.ts`.

Stable content only:

- kanji
- canonical index
- source set
- source-set version id
- code digits, ordered top-left, top-right, bottom-left, bottom-right
- meanings
- onyomi
- kunyomi
- tags and metadata

Opacity does not belong here.

## SourceSet

Owned by `src/domain/content/types.ts`.

Source sets describe who owns the kanji facts that a deck entry came from. They are content
provenance, not assignment algorithms and not learner progress.

Current source-set IDs:

- `mock-joyo`: handwritten development fixture data. It is shaped like a tiny Joyo-like deck so the
  app has useful local content, but it is not canonical Joyo data.
- `joyo`: the first real canonical source set. The current app deck is materialized from a full
  versioned in-repo Joyo import file plus an explicit import manifest.
- `jinmeiyo`: the second canonical source set path. It remains explicit and separate so name-use
  expansion does not get folded invisibly into Joyo. The current repo includes a small real
  supplemental Jinmeiyo subset import rather than an empty reservation.

Canonical source-set priority is Joyo, then Jinmeiyo. If a future import has to choose one owner for
a character or variant relationship that appears to touch both lists, classify it as Joyo and keep
Jinmeiyo supplemental. That keeps common-use kanji ownership stable before name-use expansion.

Canonical manifests should document how imported Joyo/Jinmeiyo files map to source-set versions and
how exact duplicates, variants, and source-list overlaps are resolved under the Joyo-first priority
rule. In the current pass, Jinmeiyo is a small explicit second import path rather than being merged
into the Joyo deck.

The current Joyo source-set version is `joyo-kanjidic2-2026-112`, and the current Jinmeiyo
supplemental source-set version is `jinmeiyo-kanjidic2-2026-112-subset-v1`. Each has a companion
import manifest that records the upstream KANJIDIC2 version, entry count, and normalization notes
used to materialize the in-repo canonical source files.

## AssignmentVersion

Owned by `src/domain/content/types.ts`.

Assignments need an explicit version so future deck expansion does not silently reshuffle old
mappings.

Assignment versions now name the exact source-set versions they were built from. The current deck
uses a stable base-8 permutation over `canonicalIndex`, but the important boundary is that the
assignment version explicitly references the imported source-set version IDs it materializes.

There are now two visible assignment tracks:

- `mock-joyo-fixture-assignment-v1`: development-only fixture assignment for `mock-joyo`.
- `canonical-joyo-kanjidic2-2026-112-plus-jinmeiyo-kanjidic2-2026-112-subset-v1-assignment-v1`:
  the current canonical deck assignment, tied to both imported canonical source-set versions.

Future Joyo+Jinmeiyo assignment versions should keep naming the source-set versions they were built
from so expansion cannot silently change established code mappings.

## UserProgress

Owned by `src/domain/progress/types.ts`.

Persistent per-user learning data. This is intentionally small in v1 and local only.

Progress can eventually answer questions like:

- Has the learner seen this kanji before?
- How often has the learner answered correctly?
- Is the kanji new, learning, or familiar?

It can seed a new session's starting cue support from the durable confidence bucket, but it should
not carry the live cue opacity for an active drill. Session state owns that.

TODO: Decide the minimum progress fields needed before building real scheduling.

## DrillConfig

Owned by `src/domain/drills/types.ts`.

Defines study behavior, such as mode and cue policy.

`DrillConfig` is the right place to describe whether a drill shows the cue fully, lets the session
dim it, or hides it.

The active drill modes are Learn, Faded recall, and Blind recall. Review grading uses the explicit
`again` / `good` choices from the Anki-like reveal-then-grade flow.

## SessionState

Owned by `src/domain/session/types.ts`.

Ephemeral run-specific state:

- selected kanji
- active queue order for the current run
- active item
- per-kanji attempts and `good` count for this run
- per-kanji session opacity

Session cue opacity is narrowed to the review ladder: `100%`, `66%`, `33%`, and `0%`.

This is intentionally disposable. A finished session may inform `UserProgress`, but the next
session should be able to compute its own cue state from the drill and progress inputs.

The current seeding rule is intentionally small and deterministic: Faded recall starts unseen or
`new` items at `100%`, `learning` items at `66%`, and `familiar` items at `33%`. Learn still
starts at full cue, and Blind recall still starts hidden.

The starter review loop keeps queue movement inside session state. Session creation can randomize
which kanji enter the current run, while answering or advancing still rotates the active kanji to
the back of the current run queue without mutating stable content.

TODO: Replace the starter rotation queue with a simple weighted queue after the first randomized
session selector is in place.
