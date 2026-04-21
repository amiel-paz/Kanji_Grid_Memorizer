# Data Model

The data model exists to keep stable kanji facts separate from changing learner state.

## KanjiEntry

Owned by `src/domain/content/types.ts`.

Stable content only:

- kanji
- canonical index
- source set
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
- `joyo`: future canonical Joyo data. This is the first real source-set target, but it should only
  be used after a versioned canonical import decision exists.
- `jinmeiyo`: future canonical Jinmeiyo data. This should be added later as a separate source-set
  owner with its own provenance instead of being folded invisibly into Joyo.

Canonical source-set priority is Joyo, then Jinmeiyo. If a future import has to choose one owner for
a character or variant relationship that appears to touch both lists, classify it as Joyo and keep
Jinmeiyo supplemental. That keeps common-use kanji ownership stable before name-use expansion.

TODO: Define the canonical import manifest contract that maps imported Joyo/Jinmeiyo files to
source-set versions before either source set is populated. The manifest should document how exact
duplicates, variants, and source-list overlaps are resolved under the Joyo-first priority rule.

## AssignmentVersion

Owned by `src/domain/content/types.ts`.

Assignments need an explicit version so future deck expansion does not silently reshuffle old
mappings.

For now, `placeholder-v1` is development scaffolding. It records the placeholder strategy id and
the 4096-code space size, then assigns codes by mapping `canonicalIndex` through a fixed
permutation of the four-digit base-8 code space. This keeps the demo grids visually varied while
remaining deterministic placeholder data. Production assignments should wait for a canonical,
versioned source pipeline.

The active placeholder assignment version only owns `mock-joyo`. Future production assignment
versions should explicitly name the canonical source-set versions they were built from so Joyo and
Jinmeiyo expansion cannot silently change established code mappings.

TODO: Decide how assignment versions map to imported source files, canonical source-set version IDs,
and release notes.

## UserProgress

Owned by `src/domain/progress/types.ts`.

Persistent per-user learning data. This is intentionally small in v1 and local only.

Progress can eventually answer questions like:

- Has the learner seen this kanji before?
- How often has the learner answered correctly?
- Is the kanji new, learning, or familiar?

It should not carry the live cue opacity for an active drill. Session state owns that.

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

The starter review loop keeps queue movement inside session state. Answering or advancing rotates
the active kanji to the back of the current run queue without mutating stable content.

TODO: Replace the starter rotation queue with a simple weighted queue when the first real drill is implemented.
