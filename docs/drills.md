# Drills

The scaffold represents three starting drill modes. They are the current v1 shell, not a finished
learning system. Recall drills are the useful path; grid-to-kanji matching drills are out of scope.

1. Learn: show kanji, full cue, readings, and meanings.
2. Faded recall: show kanji with cue strength controlled by session state.
3. Blind recall: show kanji without cue support.

Inside the current study shell, Learn can advance to the next kanji without grading. Review modes
keep the reveal-then-grade order, usually rotate through the selected session queue, retire a card
after a clean zero-cue pass, and only persist local progress after an explicit `Again` or `Good`.

## Cue Policy

Drills describe how much help the learner receives:

- `full`: show the cue at full strength.
- `session-dim`: let the current session adjust cue opacity.
- `hidden`: hide the cue.

`hidden` means hidden for the whole drill shell, not only at session start. Blind recall should not
quietly fade back into a visible cue after an `Again`.

The cue policy belongs to the drill configuration. The current opacity belongs to the session. The
tile only renders what it receives.

## Random 10; Dim On Success

This example shapes the architecture:

- choose 10 random kanji
- each starts at opacity `1.0`
- show the kanji card first without readings
- reveal meanings plus all known on and kun readings before grading
- correct answers reduce opacity along the `100% -> 66% -> 33% -> 0%` ladder
- misses may raise opacity one ladder step again
- a clean zero-cue pass retires the card from the rest of the current run
- this behavior belongs in session/drill logic

The current code demonstrates randomized session selection, opacity transitions, and local progress
persistence after explicit review grading. It still does not manage a weighted queue or any real
due-card scheduling.

## Interaction Boundary

The study screen can include mock controls while domain behavior is being proven. Review modes
should follow the Anki-style order: recall first, reveal readings, then choose `Again` or `Good`.

Later work can replace the starter review loop's simple rotation with smarter queue shaping after
the shell stops being the main thing under review.

## Future Daily Flow

The intended product flow is compatible with Anki-like daily pacing, but should use this project's
own mastery rule.

- New kanji now enter newly created sessions through an explicit local-first daily allowance of 5
  truly new items, derived from durable saved progress rather than from mutable session fields.
- Started-but-unfinished new kanji now carry over before fresh replacement new items are admitted
  on a later session creation.
- Kanji that clear the faded ladder onto `0%` now become durable review-bank candidates, and the
  current pass uses those candidates only as simple backfill when a new local session batch still
  has open slots after carryover and today's allowed fresh-new items. It still does not add due-card
  logic or promise a finished daily scheduler.
- A kanji can be treated as learned for the "new item" path once it successfully progresses
  through the full cue-opacity ladder, rather than by copying a generic fixed review-count rule.
- Learned items should later reappear through persistent recall drills driven by saved progress,
  not by mutating the stable kanji entry itself.
