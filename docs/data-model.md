# Data Model

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

Assignments need an explicit version so future deck expansion does not silently reshuffle old mappings.

TODO: Decide how assignment versions map to imported source files and release notes.

## UserProgress

Persistent per-user learning data. This is intentionally small in v1 and local only.

TODO: Decide the minimum progress fields needed before building real scheduling.

## DrillConfig

Defines study behavior, such as mode and cue policy.

## SessionState

Ephemeral run-specific state:

- selected kanji
- active item
- per-kanji attempts
- per-kanji session opacity

TODO: Replace the toy queue behavior with a simple weighted queue when the first real drill is implemented.
