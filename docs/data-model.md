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
  expansion does not get folded invisibly into Joyo. The current repo includes a full real
  supplemental Jinmeiyo import rather than an empty reservation.

Canonical source-set priority is Joyo, then Jinmeiyo. If a future import has to choose one owner for
a character or variant relationship that appears to touch both lists, classify it as Joyo and keep
Jinmeiyo supplemental. That keeps common-use kanji ownership stable before name-use expansion.

Canonical manifests should document how imported Joyo/Jinmeiyo files map to source-set versions and
how exact duplicates, variants, and source-list overlaps are resolved under the Joyo-first priority
rule. In the current repo, Jinmeiyo is a full explicit second import path rather than being merged
into the Joyo deck.

The current Joyo source-set version is `joyo-kanjidic2-2026-112`, and the current Jinmeiyo
supplemental source-set version is `jinmeiyo-kanjidic2-2026-112`. Each has a companion
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
- `canonical-joyo-kanjidic2-2026-112-plus-jinmeiyo-kanjidic2-2026-112-assignment-v1`:
  the current canonical deck assignment, tied to both imported canonical source-set versions.

Future Joyo+Jinmeiyo assignment versions should keep naming the source-set versions they were built
from so expansion cannot silently change established code mappings.

## UserProgress

Owned by `src/domain/progress/types.ts`.

Persistent per-user learning data. This is intentionally small in the current local MVP and local
only.

Progress can eventually answer questions like:

- Has the learner seen this kanji before?
- How often has the learner answered correctly?
- Is the kanji new, learning, or familiar?
- If this kanji was already introduced, does it still belong to the unfinished new-item carryover path?
- Has this kanji already graduated into the first review-bank candidate path?
- Has repeated failed recall recently raised its short-horizon review priority within the local
  review-bank slice?
- Was this kanji first seen on today's local date?

It can tell session creation whether a kanji is truly new today for the explicit daily new-item cap,
whether it must be re-offered as unfinished carryover before replacement new items are admitted, or
whether it already belongs to the first review-bank candidate pool after graduating out of the new
path. It can also carry a small recent failed-recall signal so later local sessions can choose some
review-bank cards earlier. It should not carry the live cue opacity for an active drill. Session
state owns that.

## DrillConfig

Owned by `src/domain/drills/types.ts`.

Defines study behavior, such as mode and cue policy.

`DrillConfig` is the right place to describe whether a drill shows the cue fully, lets the session
dim it, or hides it.

The active drill modes are Learn, Faded recall, Blind recall, and Reading MCQ. Review grading uses
the explicit `again` / `good` choices from the Anki-like reveal-then-grade flow, and Reading MCQ
maps a correct choice to `good` and a wrong choice to `again`.

## SessionState

Owned by `src/domain/session/types.ts`.

Ephemeral run-specific state:

- selected kanji
- active queue order for the current run
- active item
- per-kanji attempts and `good` count for this run
- per-kanji session opacity
- per-kanji Reading MCQ option sets when that drill is active

Session cue opacity is narrowed to the review ladder: `100%`, `66%`, `33%`, and `0%`.

This is intentionally disposable. A finished session may inform `UserProgress`, but the next
session should be able to compute its own cue state from the drill and progress inputs.

The current starting rule is intentionally small and deterministic: every new Faded recall session
starts at `100%` cue visibility, Learn still starts at full cue, and Blind recall still starts
hidden.

The current daily new-item rule is intentionally small and deterministic too: a newly created
session can admit at most 5 fresh truly new kanji per local day based on durable progress. Items
with seen durable progress that have not yet graduated into the review bank are treated as
unfinished carryover and are re-offered before fresh replacement new items are admitted. Older
carryover reduces that day's fresh-new allowance, while same-day carryover does not double-count
because `firstSeenAt` already consumed today's slot. Graduated review-bank candidates may still
fill the rest of the batch as simple available-review backfill, but repeated recent misses now
order that review-bank slice by `recentReviewFailureCount` first and `lastReviewFailureAt` second
before any remaining random tie-break. Because grading writes durable progress immediately, this
ordering can already affect another session started later the same local day; it also carries into
later local days until enough later successful review answers reduce the failure count. This pass
still does not add due dates or a scheduler; if there is not enough review-bank material to fill
the drill's nominal size, the batch may simply be smaller.

The starter review loop keeps queue movement inside session state. Session creation can randomize
which kanji enter the current run, while answering or advancing still reorders the active kanji
inside the current run queue without mutating stable content. A clean zero-cue pass may retire the
card from the rest of that run, but that remains session-owned behavior.

Deferred for later: keep the starter rotation queue until a later worktree proves a better local
queue without moving ownership out of session state.
