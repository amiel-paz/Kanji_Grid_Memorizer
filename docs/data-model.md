# Data Model

The data model exists to keep stable kanji facts separate from changing learner state.

## KanjiEntry

Stable content only:

- kanji
- canonical index
- source set
- code digits
- meanings
- onyomi
- kunyomi
- tags and metadata

Opacity does not belong here.

## AssignmentVersion

Assignments need an explicit version so future deck expansion does not silently reshuffle old
mappings.

For now, `mock-v0` is development scaffolding. Production assignments should wait for a canonical,
versioned source pipeline.

TODO: Decide how assignment versions map to imported source files and release notes.

## UserProgress

Persistent per-user learning data. This is intentionally small in v1 and local only.

Progress can eventually answer questions like:

- Has the learner seen this kanji before?
- How often has the learner answered correctly?
- Is the kanji new, learning, or familiar?

It should not carry the live cue opacity for an active drill. Session state owns that.

TODO: Decide the minimum progress fields needed before building real scheduling.

## DrillConfig

Defines study behavior, such as mode and cue policy.

`DrillConfig` is the right place to describe whether a drill shows the cue fully, lets the session
dim it, or hides it.

## SessionState

Ephemeral run-specific state:

- selected kanji
- active item
- per-kanji attempts
- per-kanji session opacity

This is intentionally disposable. A finished session may inform `UserProgress`, but the next
session should be able to compute its own cue state from the drill and progress inputs.

TODO: Replace the toy queue behavior with a simple weighted queue when the first real drill is implemented.
