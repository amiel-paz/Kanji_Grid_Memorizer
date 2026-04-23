# Product Notes

## Concept

Kanji Grid Memorizer teaches kanji with a compact, stable visual cue. Every kanji is assigned a
four-digit base-8 code, rendered as a 2x2 color grid.

The cue can be strong early in a drill and weakened later. The learner should eventually recognize
or recall the kanji without the cue.

## Product Rule

A kanji entry owns stable facts:

- the kanji
- its source set
- its assignment version
- its four code digits
- readings, meanings, tags, and metadata

A drill session owns changing study behavior:

- selected items
- active item
- answer attempts
- cue opacity
- future queue or scheduling decisions

Opacity must be derived from drill, session, or progress state at render time. It should not be
stored on `KanjiEntry`.

Saved learner progress may seed the starting cue support for a new session, but once the run
starts, live cue opacity, reveal state, attempts, and answer flow still belong to session state.

Saved learner progress is also the durable source for whether a kanji has been seen before. Session
creation may use that saved record to cap how many truly new kanji enter a local day's new batch
and to carry started-but-not-yet-familiar new kanji forward before fresh replacements are admitted,
while a separate durable review-bank signal marks when a kanji has fully left that unfinished
new-item path. That still does not move live queue or answer ownership out of session state.
The current local orchestration rule stays intentionally small: unfinished carryover first, then
today's allowed truly new kanji, then simple review-bank backfill. That is not due scheduling.

## Differentiation

This project is not a generic flashcard app, a WaniKani-style mnemonic text system, a heatmap, or
a stroke-coloring exercise.

The differentiating idea is the stable visual codebook. Drill logic decides how much of that cue to
reveal at any moment.

## Review Direction

The current local MVP keeps review close to a lightweight Anki-style reveal-first loop: show one
kanji card, answer from memory, reveal meanings plus all known on and kun readings, then choose
`Again` or `Good`.

The most useful drills are faded recall and blind recall. Grid-to-kanji matching drills are not a
product target for now.

## Version 1 Scope

- local web app
- full Joyo canonical deck plus a small explicit Jinmeiyo supplemental import path, both with in-repo provenance and source-set version metadata
- mock kanji fixtures kept for development and tests
- learn, faded recall, and blind recall modes represented in code
- simple session-state-driven cue opacity
- local progress persistence after explicit reveal-first grading
- a small local daily loop with a 5-kanji fresh-new cap, unfinished carryover, and simple
  review-bank backfill
- a learner-facing seen library sourced from durable progress plus stable content lookup
- a manual seen-intake surface for outside encounters that updates durable learner progress only
- small tests around the core idea

The current MVP is intentionally small, but it is no longer just a mock shell. It should present a
truthful local study loop rather than placeholder controls pretending a scheduler already exists.

## Out Of Scope For Now

- canonical dataset coverage beyond the explicit in-repo full Joyo import path plus the small supplemental Jinmeiyo slice
- advanced scheduling
- cloud sync
- accounts
- mobile app
- OCR
- handwriting recognition
- generated mnemonics
- replacing the explicit Joyo-first ownership rule with an ambiguous merged source

## Product Questions To Preserve

- What is the first drill that proves the cue actually helps?
- How should a miss change the next cue level?
- When does a kanji graduate from cue-supported practice to blind recall?
- How should assignment versions be communicated if source data changes?
- How should Jinmeiyo expansion be layered onto the Joyo-first canonical path without reclassifying common-use entries?

Post-MVP work can deepen scheduling, sync, and learner-library surfaces once this small local loop
has already proved worth keeping.
