# Personal Health Cockpit Implementation Packet: T9 + T10

Status: Active
Date: 2026-04-02
Parent:
- `docs/designs/2026-04-02-personal-health-cockpit-engineering-plan.md`
- `docs/designs/2026-04-02-personal-health-cockpit-tranche-plan.md`
- `docs/designs/2026-04-02-personal-health-cockpit-implementation-packet-t0-t1.md`

## Executive Call

Do not try to do HealthKit, Health Connect, MyChart/Epic, and Blue Button all at once.

That is how this turns from a strong local-first product into a brittle integration project.

The next correct move is:

1. build the native companion bridge layer
2. prove one platform end to end
3. only then add clinical interoperability on top of the bridge architecture

That means:

- `T9` first
- `T10` second

## Current Code Review

## What already exists

The app already has:

- local-first SvelteKit shell
- Dexie persistence
- typed domain model
- imports for Apple Health XML and Day One JSON
- daily tracking, journal, sobriety, assessments, nutrition, and weekly review
- unit, component, and E2E smoke coverage

Key files:

- [client.ts](/home/pyro1121/Documents/Health/src/lib/db/client.ts)
- [types.ts](/home/pyro1121/Documents/Health/src/lib/domain/types.ts)
- [imports.ts](/home/pyro1121/Documents/Health/src/lib/services/imports.ts)
- [review.ts](/home/pyro1121/Documents/Health/src/lib/services/review.ts)

## What is missing for T9/T10

The current architecture is still web-only.

There is no:

- companion app workspace
- native permission broker
- local bridge protocol
- clinical identity reconciliation layer
- SMART on FHIR OAuth flow
- provider capability matrix
- external integration test harness

## Step 0: Scope Challenge

## Minimum set of changes that achieves T9

Do not start by reading everything from HealthKit or Health Connect.

The minimum meaningful T9 is:

1. define a local bridge contract
2. build one companion proof of concept
3. ingest one or two useful data types
4. merge those into the existing canonical event model with provenance

That is enough to validate the companion architecture.

## Minimum set of changes that achieves T10

The minimum meaningful T10 is:

1. support SMART on FHIR launch + OAuth for one sandbox
2. fetch a narrow clinical read set
3. normalize those records into source-scoped clinical events
4. block import when identity is ambiguous

No provider write-back.
No scheduling.
No messaging.
No billing.

## Complexity check

`T9/T10` absolutely exceeds the 8-file / 2-service smell threshold.

That is expected.

The only way this remains sane is if the work is split into these architectural layers:

1. **Bridge layer**
2. **Connector layer**
3. **Normalization layer**
4. **Identity / provenance gate**

If those boundaries blur, the app will rot fast.

## Search-before-building findings

### [Layer 1] Native data access

- HealthKit requires native app entitlements, permission strings, and explicit read/share authorization.
- Health Connect medical records extend the Android aggregation path with FHIR-backed medical data and fine-grained permissions.

Implication:

Pure web cannot do the important native parts directly. A companion is required.

### [Layer 1] Clinical interoperability

- SMART on FHIR is the correct patient-facing standard.
- Blue Button is useful but narrower and secondary.

Implication:

Build the OAuth/launch and normalization path around SMART on FHIR concepts first, then add Blue Button as another connector if relevant.

### [Layer 3] First-principles architecture call

EUREKA:

The product should not let native companions or clinical connectors write directly into feature-specific tables.

They should only write into the same canonical event/provenance model the app already uses.

That is what keeps local trust intact.

## Architecture Review

## Recommendation

Add a **device-and-clinical bridge layer** instead of letting T9/T10 talk straight into the current services.

New top-level module family:

```text
src/lib/integrations/
  bridge/
  connectors/
  normalization/
  identity/
  manifests/
```

### Why

- `imports.ts` already stages and normalizes file-based external data
- that pattern can be generalized into a broader ingestion pipeline
- the bridge layer becomes the contract between native or remote systems and the local web app

## Proposed architecture

```text
Native companion / SMART app / Blue Button
                |
                v
        Bridge payload / OAuth response
                |
                v
        Connector adapter
                |
                v
        Normalization pipeline
                |
                +--> identity reconciliation
                +--> provenance assignment
                +--> duplicate detection
                |
                v
        Canonical local events
                |
                v
        Existing UI + review system
```

## T9: Native Companions

## Goal

Reduce manual logging burden with one working native companion path.

## Recommendation

Choose **one** native platform first, based on your real device:

- if you primarily use iPhone / Apple Watch: build **iOS HealthKit companion first**
- if you primarily use Android / Android wearable: build **Android Health Connect companion first**

Do not split effort across both on the first pass.

## In scope

- companion workspace setup
- bridge manifest and payload format
- one companion app proof of concept
- one ingestion endpoint or file handoff path into the local app
- 2-3 data types only

Recommended starter data types:

- sleep
- steps or workouts
- heart rate or resting heart rate

## Out of scope

- bi-directional writes
- full production app-store packaging
- syncing every supported type
- account/cloud identity

## New modules

```text
apps/
  ios-companion/      (if Apple-first)
  android-companion/  (if Android-first)

src/lib/integrations/
  bridge/
    schema.ts
    validate.ts
  connectors/
    healthkit.ts
    health-connect.ts
  normalization/
    health-normalize.ts
  manifests/
    device-sources.ts
```

## Bridge contract

Every companion payload should include:

- `connector`
- `connectorVersion`
- `deviceId`
- `sourcePlatform`
- `capturedAt`
- `records[]`

Each record should include:

- source record id
- source timestamp
- metric type
- unit
- value
- original raw payload

## Ingestion options

### Option A: File-based import handoff

Companion exports signed JSON bundles, web app imports them.

Pros:

- simplest
- works fully local
- easiest to test

Cons:

- manual handoff friction

### Option B: Localhost bridge

Companion runs a local bridge or shares into a loopback endpoint.

Pros:

- smoother sync experience

Cons:

- more complexity
- more platform-specific debugging

## Recommendation

Start with **Option A**.

Why:

It validates the companion data path without spending early complexity on background networking or local IPC.

## T9 tests

### Unit

- bridge schema validation
- normalization by source metric type
- duplicate reconciliation with existing local data

### Integration

- companion payload -> canonical local events
- bad payload rejected loudly

### E2E

- import companion bundle
- see data land in Timeline and Review

## T9 failure modes

| Failure | Impact | Mitigation |
|---|---|---|
| permission denied in native app | no data arrives | explicit setup UX and status surface |
| duplicate companion import | trust erosion | source record dedupe |
| native payload version mismatch | bad import or silent miss | connectorVersion gate |
| timezone mismatch | wrong day assignment | preserve source timestamp + normalize once |

## T9 acceptance criteria

- one companion works on your real device
- one bundle lands cleanly in local data
- imported device data is visible in Timeline
- no silent overwrite of manual entries

## T10: Clinical / Payer Interoperability

## Goal

Pull in one narrow lane of clinical or claims data through standards-based patient access.

## Recommendation

Start with **SMART on FHIR sandbox / Epic-compatible patient-facing flow**, not Blue Button.

Why:

- it is the more general architecture
- it teaches the launch / OAuth / FHIR normalization path
- Blue Button can slot in afterward as another connector

## In scope

- SMART launch model
- OAuth token handling for one sandbox
- fetch one narrow resource set
- normalize to local clinical events
- explicit patient identity mapping gate

Recommended starter resources:

- `Patient`
- `Observation`
- `Condition`
- `MedicationRequest` or `MedicationStatement`

## Out of scope

- provider write-back
- observation create
- messaging
- scheduling
- institution-specific production rollout

## New modules

```text
src/lib/integrations/
  connectors/
    smart-fhir.ts
    blue-button.ts
  identity/
    patient-match.ts
    source-scope.ts
  normalization/
    fhir-normalize.ts
  auth/
    smart-oauth.ts
```

## Identity rule

This is non-negotiable:

No auto-merge of clinical persons unless identity is explicit and verified.

That means:

- source-scoped patient records
- explicit mapping from portal identity to local person identity
- import blocked on ambiguity

## T10 tests

### Unit

- FHIR resource normalization
- identity mismatch detection
- source-scoping rules

### Integration

- SMART token + fetch + normalize pipeline
- malformed or partial resource handling

### E2E

- sandbox launch
- patient data fetch
- local import preview / commit

## T10 failure modes

| Failure | Impact | Mitigation |
|---|---|---|
| wrong patient merge | catastrophic trust break | explicit identity gate |
| partial resource support | confusing clinical gaps | capability matrix |
| OAuth flow drift | connector breaks silently | integration tests + status surface |
| ambiguous terminology mapping | misleading timeline | resource-type-specific normalization |

## T10 acceptance criteria

- one SMART sandbox path works end to end
- one narrow clinical resource lane is visible in local timeline
- identity ambiguity blocks import safely

## Code Quality Review

## Main strengths in current code

- services are already separated by domain
- the import pipeline exists conceptually
- source-of-truth docs are strong
- unit/component/E2E coverage exists across every current surface

## Main gaps before T9/T10

1. current `imports.ts` is still a browser/file import service, not a generalized connector substrate
2. there is no identity/provenance gate layer yet
3. there is no bridge contract or connector capability manifest
4. there is no test harness for native or OAuth-based integration scenarios

## Test Review

## Current coverage posture

Already covered:

- daily tracking
- journal
- sobriety
- assessments
- nutrition
- file imports
- weekly review

Missing for T9/T10:

- bridge schema tests
- payload-version tests
- device bundle import tests
- SMART OAuth mocks
- FHIR normalization tests
- identity mismatch tests

## Required new test plan

```text
CODE PATHS
==========
bridge/schema.ts
  - payload validate
  - connector version gate
  - malformed bundle reject

connectors/healthkit.ts or health-connect.ts
  - metric map
  - missing permission state
  - duplicate bundle replay

connectors/smart-fhir.ts
  - launch params
  - token exchange
  - Patient/Observation fetch
  - capability mismatch

identity/patient-match.ts
  - exact match
  - ambiguous match
  - no match

USER FLOWS
==========
1. import native companion bundle
2. see imported device data in timeline
3. connect SMART sandbox
4. review clinical preview and approve
5. block import on identity ambiguity
```

## Performance Review

## Main concerns

1. repeated FHIR normalization can get heavy if you import large bundles
2. native companion bundles may balloon in size if raw payloads are unbounded
3. clinical resource replay must not trigger full weekly recompute on every partial import

## Recommendation

- keep T9/T10 imports staged and incremental
- cap or chunk raw artifacts
- reuse the existing snapshot pattern so the review route stays cheap

## NOT in scope

- simultaneous iOS + Android first pass
- production App Store / Play Store release
- provider write-back
- production multi-provider EHR rollout
- cloud sync
- every wearable API

## What already exists

- current local import staging pattern in `src/lib/services/imports.ts`
- provenance-aware health events in `src/lib/domain/types.ts`
- review snapshots in `src/lib/services/review.ts`
- strong browser-level coverage for all current user flows

## Parallelization strategy

| Step | Modules touched | Depends on |
|---|---|---|
| bridge contract | `src/lib/integrations/bridge`, `src/lib/domain` | — |
| native companion POC | `apps/ios-companion` or `apps/android-companion`, `src/lib/integrations/connectors` | bridge contract |
| local companion import path | `src/lib/services/imports.ts`, `src/lib/integrations/normalization` | bridge contract |
| SMART auth + fetch | `src/lib/integrations/auth`, `src/lib/integrations/connectors` | bridge contract |
| FHIR normalization + identity gate | `src/lib/integrations/normalization`, `src/lib/integrations/identity` | SMART auth + fetch |
| review/timeline surfacing | `src/routes/timeline`, `src/routes/review`, `src/lib/services/review.ts` | local companion import path and/or FHIR normalization |

### Parallel lanes

- Lane A: bridge contract
- Lane B: native companion POC after A
- Lane C: SMART auth/fetch after A
- Lane D: FHIR normalization + identity after C
- Lane E: review/timeline surfacing after B or D depending on source

### Execution order

Start with A.

Then B and C can run in parallel.

Then D.

Then E.

That is the clean split.

## Final recommendation

Do not start T10 first.

Start with `T9` as a bridge-layer tranche, one platform only, file-based companion handoff only.

Once that works, do `T10` as one narrow SMART on FHIR sandbox lane with explicit identity blocking.

That is the smallest path that proves the architecture without detonating the product.
