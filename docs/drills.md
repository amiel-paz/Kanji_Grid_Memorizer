# Drills

The scaffold represents five starting drill modes:

1. Learn: show kanji, full cue, readings, and meanings.
2. Recognize from grid: show grid, pick kanji.
3. Match grid to kanji: show kanji, pick grid.
4. Faded recall: show kanji with dimmed cue.
5. Blind recall: show kanji without cue.

## Random 10; Dim On Success

This example shapes the architecture:

- choose 10 random kanji
- each starts at opacity `1.0`
- correct answers reduce opacity for later appearances
- misses may raise opacity again
- this behavior belongs in session/drill logic

TODO: Implement real answer handling and queue selection. The current code only demonstrates opacity transitions.
