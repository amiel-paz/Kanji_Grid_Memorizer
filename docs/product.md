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

## Differentiation

This project is not a generic flashcard app, a WaniKani-style mnemonic text system, a heatmap, or
a stroke-coloring exercise.

The differentiating idea is the stable visual codebook. Drill logic decides how much of that cue to
reveal at any moment.

## Review Direction

The current v1 shell keeps review close to a lightweight Anki-style reveal-first loop: show one
kanji card, answer from memory, reveal meanings plus all known on and kun readings, then choose
`Again` or `Good`.

The most useful drills are faded recall and blind recall. Grid-to-kanji matching drills are not a
product target for now.

## Version 1 Scope

- local web app
- mock kanji data
- learn, faded recall, and blind recall modes represented in code
- simple session-state-driven cue opacity
- small tests around the core idea

The v1 scaffold may use toy interaction as long as it remains honest about what is real. "Mock
correct" and "Mock miss" are acceptable while session behavior is being shaped. They should not be
presented as a finished drill loop.

## Out Of Scope For Now

- canonical importer
- advanced scheduling
- cloud sync
- accounts
- mobile app
- OCR
- handwriting recognition
- generated mnemonics
- canonical kanji dataset selection

## Product Questions To Preserve

- What is the first drill that proves the cue actually helps?
- How should a miss change the next cue level?
- When does a kanji graduate from cue-supported practice to blind recall?
- How should assignment versions be communicated if source data changes?
- Which standard kanji dataset should supply Joyo and Jinmeiyo readings?

Later product work can define the first real learning workflow once this shell is no longer the
main thing being validated.
