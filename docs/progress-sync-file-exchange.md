# Progress Sync File Exchange

This document defines a post-MVP, serverless path for moving learner progress between a small
number of personal devices without adding accounts, cloud APIs, or backend ownership of study
state.

It is a decision/spec pass only. The current shipped app still stores durable learner progress in
localStorage on one device.

## Goals

- Keep learner-state exchange account-free and local-first.
- Preserve the repo's current ownership split:
  - `KanjiEntry` still owns stable content only.
  - `UserProgress` still owns durable learner state only.
  - Session state still owns live queue position, reveal state, attempts, and per-run cue changes.
- Support manual export/import and shared-folder sync between a few trusted personal devices.
- Prefer per-device append-only learner events over shipping opaque merged counters.
- Leave room for future manual-seen intake without redesigning the file format again.

## Non-Goals

- No cloud account system, hosted sync service, or background device coordination.
- No REST, GraphQL, RPC, or auth boundary.
- No attempt to sync live session state, reveal state, or in-progress queue position.
- No stable-content export. Meanings, readings, code digits, and source ownership stay in repo
  content files, not in learner-state exchange files.
- No promise of concurrent real-time collaboration. This is for one learner moving their own state
  across personal devices.

## Decision Summary

Use one versioned learner-state file per device. Each file is owned by that device and contains:

- file metadata
- the device identity
- content-version hints for sanity checks
- one optional bootstrap snapshot for migrating today's aggregate local store
- an append-only event log for later learner actions

Devices do not edit each other's files. Merging means taking the union of known device files,
deduplicating by stable event identifiers, then reducing the combined learner history back into the
current `UserProgress` shape for local use.

## Why Per-Device Event Logs

Raw merged counters are easy to copy but hard to trust once more than one device exists:

- they hide where a change came from
- they make duplicate imports hard to detect
- they make later manual-seen events or richer review history awkward to add
- they invite silent last-write-wins loss if two devices both export snapshots

Per-device event logs keep authorship and deduplication simple:

- each device appends only to its own file
- imports can ignore already-seen event IDs
- the app can always re-materialize the durable `UserProgress` view from the combined history
- future learner-state features can add new event types without rewriting the whole format

## Proposed File Shape

Suggested filename pattern:

```text
kanji-grid-progress/<deviceId>.json
```

Suggested top-level shape:

```json
{
  "format": "kanji-grid-progress-device-file",
  "schemaVersion": 1,
  "device": {
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "deviceLabel": "MacBook Air"
  },
  "exportedAt": "2026-04-23T07:00:00.000Z",
  "contentHint": {
    "assignmentVersion": "canonical-joyo-kanjidic2-2026-112-plus-jinmeiyo-kanjidic2-2026-112-assignment-v1",
    "sourceSetVersions": {
      "joyo": "joyo-kanjidic2-2026-112",
      "jinmeiyo": "jinmeiyo-kanjidic2-2026-112"
    }
  },
  "bootstrapSnapshot": {
    "snapshotId": "550e8400-e29b-41d4-a716-446655440000:bootstrap:1",
    "createdAt": "2026-04-23T07:00:00.000Z",
    "progressByKanji": {
      "日": {
        "seenCount": 4,
        "goodCount": 3,
        "firstSeenAt": "2026-04-20T15:00:00.000Z",
        "lastSeenAt": "2026-04-22T18:00:00.000Z",
        "confidence": "familiar",
        "reviewBankCandidate": true
      }
    }
  },
  "events": [
    {
      "eventId": "550e8400-e29b-41d4-a716-446655440000:5",
      "occurredAt": "2026-04-23T19:25:00.000Z",
      "type": "review-answered",
      "kanji": "月",
      "reviewGrade": "good",
      "previousCueOpacity": 0.66,
      "nextCueOpacity": 0.33
    }
  ]
}
```

## Schema Rules

### Required top-level metadata

- `format` is a fixed string so unrelated JSON files are easy to reject.
- `schemaVersion` is a required integer.
- `device.deviceId` is a stable per-install UUID persisted locally.
- `exportedAt` records when the file was written.
- `contentHint` carries content-version hints for sanity checks and user-facing warnings.

### Bootstrap snapshot

`bootstrapSnapshot` is optional, but version 1 should allow exactly one per device file.

Its only purpose is migration from today's aggregate local progress store. It exists because the
current app does not yet retain a durable append-only event history.

Rules:

- a device writes at most one bootstrap snapshot for its file lineage
- a bootstrap snapshot is identified by `snapshotId`
- re-importing the same snapshot is a no-op
- if the same `snapshotId` appears with different contents, the import should stop and surface a
  corruption/conflict warning

Once a device has migrated, normal learner-state movement should happen through appended events.

### Event records

Version 1 should reserve explicit event types instead of relying on raw counter diffs.

Initial event types:

- `review-answered`
  - fields: `eventId`, `occurredAt`, `kanji`, `reviewGrade`, `previousCueOpacity`,
    `nextCueOpacity`
- `manual-seen`
  - reserved for the later manual-intake worktree
  - fields: `eventId`, `occurredAt`, `kanji`, `source`

Rules:

- `eventId` must be unique within and across imports
- recommended shape is `<deviceId>:<monotonic-sequence>`
- events are immutable once written
- unknown event types should be preserved but ignored until a future schema version knows how to
  reduce them

## Device Identity Assumptions

- One learner owns all participating devices.
- Device identity is local and unauthenticated: a random UUID plus an optional human label is
  enough.
- There is no server authority deciding whose state wins.
- Importing from an unknown device should be a deliberate user action, not silent background
  behavior.

This is a trust-by-possession model, not a security model.

## Import/Export And Shared-Folder Rules

Two acceptable exchange modes:

1. Manual import/export
2. Shared-folder exchange through something like iCloud Drive, Dropbox, Syncthing, or a USB copy

Recommended rules:

- each device writes only its own `<deviceId>.json`
- export rewrites the current device file atomically
- import reads every discovered device file, validates each one, then merges by union of bootstrap
  snapshots and events
- shared-folder mode should behave the same way as repeated imports from multiple files
- the app should never try to merge two device histories by editing them into one shared master
  file

## Merge Behavior

Import reduction order:

1. Validate top-level format and schema version.
2. Group files by `deviceId`.
3. Accept at most one bootstrap snapshot per `snapshotId`.
4. Union all events by `eventId`.
5. Sort the combined timeline by `occurredAt`, then `eventId` for deterministic replay.
6. Reduce the combined learner history into the local `UserProgress` map.

The replay target is still the durable learner-state boundary, not session state.

That means imports may update:

- `seenCount`
- `goodCount`
- `firstSeenAt`
- `lastSeenAt`
- `confidence`
- `reviewBankCandidate`

Imports must not update:

- active queue order
- active drill reveal state
- in-progress attempts for the current run
- live session cue opacity

## Conflict Handling

### Duplicate imports

If a file or event has already been imported, replay should be idempotent.

### Same event ID, different payload

Treat as corruption or manual tampering. Do not guess. Surface the problem and leave current local
progress unchanged until the user resolves it.

### Missing local content

If an imported event references a kanji not present in the current canonical deck, preserve the
record as unresolved learner state rather than mutating stable content or dropping the data.

That unresolved state can become usable later if the canonical content expands.

### Content-version mismatch

`contentHint` is a warning signal, not a hard ownership transfer. Import should still be possible
when the learner-state record is otherwise valid, because progress is keyed to the stable kanji and
not to copied meanings or code digits. The UI should warn when device files were exported against a
different assignment or source-set version.

## Migration Posture

Version 1 needs to bridge from today's localStorage snapshot model without pretending the app
already has historical events.

Recommended migration path:

1. Generate a stable local `deviceId` when file exchange is first enabled.
2. On that device's first export, emit one `bootstrapSnapshot` synthesized from current
   `UserProgress`.
3. After migration, append real learner events for future review answers and future manual-seen
   actions.
4. Keep the local reduced `UserProgress` cache for runtime use; the file format exists for exchange
   and replay, not for replacing the local runtime shape with raw event arrays everywhere.

This keeps today's runtime model intact while giving future sync work a forward-compatible path.

## Why This Preserves Existing Ownership Boundaries

The proposed file format carries only durable learner state plus enough metadata to merge it
responsibly.

It does not carry:

- stable `KanjiEntry` facts like meanings, readings, source ownership, or code digits
- live session state like active card position, reveal status, or current queue order
- backend-issued account identifiers

That keeps:

- stable content in canonical source files and manifests
- durable learner history in `UserProgress` and future learner events
- live per-run behavior in session state

## Deferred Questions

- Should future export/import keep unresolved learner events in a separate local store bucket or in
  the same durable progress file?
- When manual-seen intake lands, should `source` be a free string or a constrained enum such as
  `outside-reading`, `name-encounter`, or `manual-browse`?
- If later scheduling becomes more sophisticated, should future event versions record more context
  than review grade plus cue transition?
