# Drills

The scaffold represents three starting drill modes. They are product targets, not all finished
interactions. Recall drills are the useful path; grid-to-kanji matching drills are out of scope.

1. Learn: show kanji, full cue, readings, and meanings.
2. Faded recall: show kanji with cue strength controlled by session state.
3. Blind recall: show kanji without cue support.

## Cue Policy

Drills describe how much help the learner receives:

- `full`: show the cue at full strength.
- `session-dim`: let the current session adjust cue opacity.
- `hidden`: hide the cue.

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
- this behavior belongs in session/drill logic

The current code demonstrates opacity transitions only. It does not yet choose a random set, manage
a real answer queue, or persist results into learner progress.

## Interaction Boundary

The study screen can include mock controls while domain behavior is being proven. Review modes
should follow the Anki-style order: recall first, reveal readings, then choose `Again` or `Good`.

TODO: Implement real answer handling and queue selection for faded and blind recall. The current
code only demonstrates opacity transitions.

## Future Daily Flow

The intended long-term product flow is compatible with Anki-like daily pacing, but should use this
project's own mastery rule.

- New kanji should be introduced through a daily allowance instead of exposing the whole deck at
  once.
- If a learner does not finish all of the day's new kanji, the unfinished items should carry over
  before more new items are introduced.
- A kanji can be treated as learned for the "new item" path once it successfully progresses
  through the full cue-opacity ladder, rather than by copying a generic fixed review-count rule.
- Learned items should later reappear through persistent recall drills driven by saved progress,
  not by mutating the stable kanji entry itself.
