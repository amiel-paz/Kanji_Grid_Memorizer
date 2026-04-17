# Drills

The scaffold represents five starting drill modes. They are product targets, not all finished
interactions.

1. Learn: show kanji, full cue, readings, and meanings.
2. Recognize from grid: show grid, pick the matching kanji.
3. Match grid to kanji: show kanji, pick the matching grid.
4. Faded recall: show kanji with cue strength controlled by session state.
5. Blind recall: show kanji without cue support.

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
- correct answers reduce opacity for later appearances
- misses may raise opacity again
- this behavior belongs in session/drill logic

The current code demonstrates opacity transitions only. It does not yet choose a random set, manage
a real answer queue, or persist results into learner progress.

## Interaction Boundary

The study screen can include mock controls while domain behavior is being proven. Those controls
should stay visibly temporary until a worktree owns real answer choices and queue progression.

TODO: Implement real answer handling and queue selection. The current code only demonstrates
opacity transitions.
