# Product Notes

## Concept

Kanji Grid Memorizer teaches kanji using a compact, stable visual cue. Every kanji is assigned a four-digit base-8 code, rendered as a 2x2 color grid.

The cue can be strong early in a drill and weakened later. The learner should eventually recognize or recall the kanji without the cue.

## Differentiation

This project is not a generic flashcard app, a WaniKani-style mnemonic text system, a heatmap, or a stroke-coloring exercise.

The differentiating idea is the stable visual codebook. Drill logic decides how much of that cue to reveal at any moment.

## Version 1 Scope

- local web app
- mock kanji data
- several represented drill modes
- simple session-state-driven cue opacity
- small tests around the core idea

## Out Of Scope For Now

- canonical importer
- advanced scheduling
- cloud sync
- accounts
- mobile app
- OCR
- handwriting recognition
- generated mnemonics

TODO: Define the first real learning workflow once the scaffold feels comfortable to modify.
