# API Boundary Review

Historical note: this document captured the repo's posture before the later
`work/backend-review-scheduler` pass. That newer pass adds a narrow hosted scheduling boundary
only after the local-first loop and follow-on drills made the ownership split clearer. The cautions
below still matter for everything the server should not own.

This document revisits whether Kanji Grid Memorizer needs a backend or formal API boundary after
the first local-first MVP has become real.

Current answer: not yet.

The app now has enough local value that the question is worth documenting, but it still does not
have a product need strong enough to justify REST, RPC, auth, or hosted state.

## Current Posture

The current product is:

- one learner
- one browser app
- one local runtime
- one durable learner-state boundary in local storage
- explicit in-repo canonical content
- no cloud identity or hosted synchronization

That posture still fits the product well because the main product risks are local drill quality,
review usefulness, and ownership discipline, not multi-user coordination.

## What An API Would Actually Solve

An API would only be justified if the product needed at least one of these in a real way:

- seamless multi-device background sync that is more reliable than manual/shared-folder file
  exchange
- account-backed backups and restore across device loss
- a shared canonical content service instead of shipping content in repo/app builds
- multi-user administration or shared learner access
- analytics or experimentation that genuinely require a server-owned write path
- mobile or other clients that can no longer rely on the same local storage assumptions

Those are real product problems, but they are not the current MVP's primary bottlenecks.

## Why Not Now

The repo already has two cheaper steps before any backend commitment:

1. A working local-first MVP for daily use.
2. A documented file-based learner-state exchange path in
   [`docs/progress-sync-file-exchange.md`](docs/progress-sync-file-exchange.md).

That means the next likely pain is not "we cannot function without a server." It is more likely one
of these:

- manual file exchange feels too cumbersome
- learner-library UI needs to expose more durable progress locally
- scheduling needs to mature before sync complexity is worth paying for

Adding an API now would raise cost and ambiguity before the product has proved it needs that cost:

- auth and identity decisions would arrive before a clear product need
- hosted learner-state ownership would muddy the current clean local/session/content split
- backend work could distract from the still-small local study loop and learner-library follow-ons

## Triggers That Would Justify Revisiting

Revisit the decision only if one or more of these become true:

- the file-based exchange path proves too fragile or annoying for normal personal multi-device use
- the product needs automatic conflict resolution across devices without explicit import/export
- mobile clients become a real target and need a shared learner-state source
- recovery from lost hardware becomes a core promise rather than a nice-to-have
- content updates must be distributed independently of app releases
- the app grows into a multi-user or coach/admin product

If those signals are not present, the backend question is still premature.

## Candidate Resources If An API Is Ever Needed

If a future API does become necessary, candidate resources should stay narrow and reflect the
existing ownership model rather than collapsing everything into one generic blob.

Likely resources:

- `learner-progress`
  - durable learner state only
  - counts, confidence, review-bank membership, first/last seen timestamps
- `learner-events`
  - optional append-only event stream if the file-exchange model graduates to a hosted merge path
- `content-manifests`
  - read-only source-set and assignment version metadata
- `content-updates`
  - optional read-only deck/version discovery if content shipping stops living entirely in repo/app
- `device-exports`
  - only if the file-based exchange model needs a hosted relay rather than direct file movement

Things that should not become first-class mutable API resources too early:

- live session queue state
- reveal state
- per-run attempts
- cue opacity during an active session
- mutable `KanjiEntry` facts owned by stable content

## Boundaries To Preserve

Even with a future API, the current ownership split should survive:

- `KanjiEntry` stays stable content, not learner state
- `UserProgress` stays durable learner state, not canonical content
- session state stays client-owned live run behavior

In practical terms:

- the client should still compute active session behavior locally
- the server should not become the authority on cue opacity for a live card
- canonical content should stay versioned and explicit, not silently rewritten by learner traffic

## Recommended Future Sequence

If the product does need more than the current local-first MVP, the next order should still be:

1. learner-library follow-ons
2. prove or reject the file-based multi-device path
3. only then revisit whether a hosted API is worth the added complexity

That sequence keeps the app honest about what the backend would be for.

## Historical Decision

At the time this document was written, the right answer was to avoid broad backend work.

That caution still applies beyond the current narrow scheduler pass: do not let the server absorb
stable content ownership, live session state, auth, sync, or broad learner-progress hosting unless
real usage later proves those costs are necessary.
