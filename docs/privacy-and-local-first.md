# Privacy And Local-First Model

Status: Active  
Date: 2026-04-10

This file explains the trust model of the app.

If the app ever becomes confusing about where data lives or when remote systems matter, this is the document to update.

## Core Promise

This app is useful without a cloud account.

That is not a marketing line. It is the actual architecture constraint.

The app should remain valuable when:
- external APIs are down
- integration credentials are missing
- the user is offline
- CI is broken

If a feature only works when a remote dependency behaves perfectly, it should be treated as optional or secondary.

## What Local-First Means Here

```text
canonical user state
  -> stored locally
  -> read and written by feature services
  -> rendered directly in feature pages

optional external systems
  -> enrich
  -> import
  -> advise
  -> never become the sole owner of core user truth
```

Examples:
- daily check-ins are local
- journal entries are local
- sobriety history is local
- assessment history is local
- weekly review output is derived locally
- import preview and commit happen against local storage

## Sensitive Data

These domains should be treated as sensitive by default:
- mental health notes
- sobriety events
- symptom logs
- sleep context
- assessment results
- imported clinical or wearable history

That means:
- no casual logging of payloads
- no unnecessary serialization into third-party systems
- no vague “temporary” remote caching
- no hidden network dependency in core flows

## Data Ownership Model

Canonical local records:
- daily records
- journal entries
- food entries
- health events
- sobriety events
- assessment results
- weekly plans / plan slots
- workout templates
- import batches / staged artifacts

Derived local records:
- review snapshots
- adherence matches
- derived grocery items

Remote or external systems may:
- provide source data for import
- provide enrichment for food lookup
- provide advisory automation in CI

They do not own the core user state.

## External Dependencies

### USDA

Used for:
- nutrition enrichment
- optional live search

Failure mode:
- app should fall back to local search behavior

### Open Food Facts

Used for:
- packaged-food search and barcode enrichment

Failure mode:
- app should still function with local catalog items

### SMART / HealthKit / Day One imports

Used for:
- import into local timeline and review system

Failure mode:
- import should fail safely before commit
- local existing data should remain intact

### xAI / Grok automation

Used for:
- PR review
- CI automation
- advisory or bounded repair lanes

Failure mode:
- developer workflows degrade, but user health data flows should not

## Review Refresh Model

Weekly review artifacts are derived from local feature state.

```text
user mutation
  -> local canonical tables update
  -> optional review refresh
  -> local review snapshot/adherence materialization
  -> next review page load reflects new truth
```

This is why many feature mutations trigger review refreshes. Review is not a separate remote analytics system. It is a local synthesis layer.

## Safe Engineering Rules

Good changes:
- make ownership more explicit
- keep imports direct to real owner modules
- keep side effects visible
- preserve local-first fallbacks
- add regression tests when a cleanup touches shared derived data

Bad changes:
- hide important writes behind a generic abstraction
- make remote enrichment mandatory for a core flow
- add logs that expose health payloads casually
- make review depend on services that can fail outside the user’s device

## Privacy Review Checklist

Before shipping a change, ask:

1. Does this move any sensitive data into a new place?
2. Does this make a core user flow depend on a remote API?
3. Does this log user health content where it shouldn’t?
4. Does this make imported data harder to explain or trace?
5. If the network disappears, does the app still work for the core use case?

If the answer is bad, stop and fix the design, not just the code.

## Documentation Rule

If a change modifies:
- data ownership
- remote dependency role
- import behavior
- privacy boundaries
- review refresh dependencies

update this file in the same tranche.
