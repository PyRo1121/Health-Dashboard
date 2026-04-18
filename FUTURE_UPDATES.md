# FUTURE_UPDATES

This file is the source of truth for bringing `personal-health-cockpit` to production grade.

It is intentionally opinionated. Future implementation work should follow this document unless a later PR explicitly updates it.

## Status

- Current repo state: shippable only for controlled/private use, not production-grade.
- Main blockers are not just “bugs.” They are:
  - trust-boundary gaps
  - persistence/integrity gaps
  - dual runtime drift between tests and production
  - false confidence in CI/release
  - UX states that can mislead users

## Guiding decisions

### 1. Authentication and session management

Decision:

- Adopt **Better Auth** for real authentication and session management.
- Use **database-backed sessions**, not stateless-only sessions, for the first production-grade pass.
- Fail closed in production if auth configuration is missing.
- Protect all `+server.ts` routes by default and explicitly allowlist any public endpoints.

Why:

- Better Auth already provides:
  - SvelteKit integration
  - database adapters, including Drizzle
  - cookie-based session management
  - trusted origins
  - secure cookie controls
- Better Auth’s own docs note that cookie cache can delay revocation on other devices until cache expiry. Because this app stores highly sensitive health data, immediate revocation and auditability matter more than shaving a DB read.
- OWASP guidance strongly favors secure, HTTP-only, properly scoped cookies over ad-hoc local storage/session hacks.

References:

- Better Auth SvelteKit integration: `https://www.better-auth.com/docs/integrations/svelte-kit`
- Better Auth installation and Drizzle adapter examples: `https://www.better-auth.com/docs/installation`
- Better Auth session management: `https://www.better-auth.com/docs/concepts/session-management`
- Better Auth cookies and trusted origins: `https://www.better-auth.com/docs/concepts/cookies`, `https://www.better-auth.com/docs/reference/options`
- OWASP Authentication Cheat Sheet: `https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html`
- OWASP Session Management Cheat Sheet: `https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html`

Implications for this repo:

- The current fail-open behavior in [src/lib/server/http/session-guard.ts](/home/pyro1121/Documents/Health/src/lib/server/http/session-guard.ts) is not acceptable for production.
- The current SMART/FHIR owner-profile trust boundary must be reworked to use server-trusted identity only.
- Browser-local owner profile storage is not sufficient as an authoritative import guard.

### 2. Storage and migrations

Decision:

- Stop expanding the current JSON mirror pattern.
- Move toward typed repositories and real constraints.
- All schema-changing or bulk-import paths must be transactional and replay-safe.
- Add natural-key uniqueness where the business model requires singleton or idempotent rows.

Why:

- SQLite supports transactions and unique indexes directly.
- Drizzle supports transactions and migrations, including custom migrations.
- The current mirror layer stores `record_json` blobs with thin text indexes. That is good enough for compatibility, but weak for long-term integrity, performance, and migration safety.

References:

- Drizzle migrations: `https://orm.drizzle.team/docs/migrations`
- Drizzle transactions: `https://orm.drizzle.team/docs/transactions`
- Drizzle indexes and constraints: `https://orm.drizzle.team/docs/indexes-constraints`
- SQLite transactions: `https://www.sqlite.org/lang_transaction.html`
- SQLite unique indexes: `https://www.sqlite.org/lang_createindex.html`

Implications for this repo:

- [src/lib/server/db/drizzle/schema.ts](/home/pyro1121/Documents/Health/src/lib/server/db/drizzle/schema.ts) is still a compatibility mirror.
- [src/lib/server/db/drizzle/client.ts](/home/pyro1121/Documents/Health/src/lib/server/db/drizzle/client.ts) bootstraps schema dynamically and sets `user_version`, but does not validate that old DBs actually match current expectations.
- [src/lib/server/db/drizzle/import-snapshot.ts](/home/pyro1121/Documents/Health/src/lib/server/db/drizzle/import-snapshot.ts) must become transactional and replay-safe.

### 3. E2E, CI, and release truthfulness

Decision:

- A green main branch must mean:
  - typecheck passed
  - unit tests passed
  - component tests passed
  - E2E passed
  - smoke checks passed
  - operational checks passed
- Release must not publish artifacts that skipped those gates.
- Browser seeding/setup should use a centralized Playwright setup path, not scattered inline request calls.

Why:

- Playwright recommends project dependencies for global setup because they integrate better with fixtures, traces, and reporting.
- GitHub branch protection only works well when required job names are stable and unique.
- Right now CI and release provide partial proof, not production proof.

References:

- Playwright authentication: `https://playwright.dev/docs/auth`
- Playwright APIRequestContext: `https://playwright.dev/docs/api/class-apirequestcontext`
- Playwright global setup and teardown: `https://playwright.dev/docs/test-global-setup-teardown`
- Playwright CI: `https://playwright.dev/docs/ci-intro`
- GitHub protected branches / required status checks: `https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches`
- GitHub troubleshooting required status checks: `https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks`

Implications for this repo:

- Main CI in [.github/workflows/ci.yml](/home/pyro1121/Documents/Health/.github/workflows/ci.yml) does not currently require E2E.
- Release in [.github/workflows/release.yml](/home/pyro1121/Documents/Health/.github/workflows/release.yml) can publish artifacts without full runtime proof.
- Current E2E is false-red because `/api/db/migrate` now requires a control-plane token and the shared seed path does not send it.

### 4. External integration reliability

Decision:

- All outbound GETs to third-party services must go through one shared remote-fetch policy:
  - timeout
  - bounded retry with jitter
  - degradation metadata
  - consistent error mapping
- Cache writes must be best-effort and must not sit on the critical path for successful upstream reads.
- Input contracts for upstream query routes must be bounded and normalized.

Why:

- Sensitive health workflows should degrade predictably under upstream stalls.
- Current external behavior is inconsistent: some clients use timeout wrappers, some do not, and some successful upstream reads can still fail because cache persistence is in the response path.

Implications for this repo:

- TheMealDB client has no timeout.
- Nutrition/clinical clients need unified request policy.
- Import parsing and upstream query inputs need stronger size and length limits.

## Current severity-ranked blocker list

### P0

1. Production auth can fail open if config is missing.
2. Trusted owner identity for SMART/FHIR imports is not server-trusted.
3. Dual runtime architecture means tests and production already diverge.
4. Weekly review recomputation is on hot write paths and scales with total data, not affected data.
5. Release can publish artifacts without full runtime proof.

### P1

1. Snapshot migration is partial and not replay-safe.
2. Mirror schema still permits duplicate business rows with inconsistent selectors across features.
3. Review can select a different weekly plan than Plan/Today.
4. `localDay` derivation is inconsistent across import sources.
5. TheMealDB search path has no timeout.
6. Remote cache writes can turn successful upstream reads into 500s.
7. E2E seeding is broken because `/api/db/migrate` now requires a control-plane token.
8. Runtime dependency vulnerabilities remain on important server-path packages.

### P2

1. Import source switching can keep stale preview/commit state armed.
2. Mobile navigation hides most app surfaces.
3. The home route is effectively empty.
4. Planning reorder controls show dead interactions at list edges.
5. Coverage thresholds exist but are not actually enforced in CI.

## Target end state

When this repo is production-grade, it should satisfy all of the following:

- authenticated by default
- explicit public route allowlist
- trusted owner identity stored server-side
- bounded request bodies and bounded upstream query inputs
- transaction-safe migrations and imports
- unique constraints or canonical selectors for singleton business rows
- one shared business-logic layer used by both tests and runtime
- review recomputation decoupled from write latency
- E2E required in branch protection
- release gated on the same proof set as merge
- smoke and operational checks required
- integrations resilient under upstream stalls and transient failures
- first-run UX and mobile nav are coherent and honest

## Phased execution plan

### Phase 0: containment

Objective:

- eliminate catastrophic trust-boundary and deployment misconfiguration risk

Deliverables:

1. Fail-closed auth in production
2. explicit local-dev insecure override
3. trusted server-side owner identity for imports
4. import/migration body-size limits
5. dependency patch tranche for runtime-path highs
6. fix E2E seed contract to pass control-plane token

Must pass before moving on:

- no fail-open production auth
- no request-body `ownerProfile` trust for import commit
- E2E seed path working again

### Phase 1: integrity

Objective:

- make persisted state deterministic and replay-safe

Deliverables:

1. transactional snapshot migration
2. replay-safe import/migration behavior
3. canonical singleton selectors for weekly plans and daily records
4. natural-key uniqueness plan and first constraint rollout
5. consistent `localDay` derivation across all import sources
6. explicit policy for legacy `plannedMeals` snapshots

Must pass before moving on:

- no partial snapshot import
- no first-row ambiguity in review/today/plan for singleton entities
- same event timestamp maps to same day/week regardless of source

### Phase 2: CI, E2E, and release truthfulness

Objective:

- ensure green means safe

Deliverables:

1. required CI gate includes E2E
2. required `test:smoke`
3. required `check:operational`
4. enforced coverage thresholds in CI
5. repaired Snyk/DAST workflow wiring
6. explicit iOS companion CI policy

Must pass before moving on:

- branch protection requires the real proof set
- release cannot publish without those gates

### Phase 3: external integrations hardening

Objective:

- make third-party dependencies predictable and non-fragile

Deliverables:

1. shared remote-fetch helper with timeout + retry policy
2. best-effort cache writes
3. bounded query contracts
4. Day One stable dedupe fallback
5. USDA key hygiene review

Must pass before moving on:

- no raw external GET path without timeout policy
- upstream read success not blocked by local cache persistence failure

### Phase 4: architecture de-drift

Objective:

- remove the structures that keep recreating bugs

Deliverables:

1. move review refresh off the hot write path
2. shared use-case layer for planning/today
3. shared use-case layer for review
4. freeze mirror expansion
5. introduce first typed repository slice

Must pass before moving on:

- same core business rule is not implemented twice
- test runtime and production runtime use the same business logic

### Phase 5: UX honesty and finish quality

Objective:

- remove misleading states and unfinished-product feel

Deliverables:

1. clear import preview state on source switch
2. fix mobile navigation discoverability
3. replace empty home route with real overview surface
4. remove dead controls and placeholder-heavy shell copy

## Recommended order of work

1. Phase 0
2. Phase 2 E2E seed repair
3. Phase 1 transactional migration + canonical selectors
4. Phase 1 localDay normalization + Day One dedupe
5. Phase 2 required CI gates and coverage enforcement
6. Phase 3 integration hardening
7. Phase 4 architecture consolidation
8. Phase 5 UX honesty pass

## Six-lane implementation staffing

### Lane 1: security/auth

- fail-closed auth
- trusted owner identity
- body-size caps
- dotted-route/public-route allowlist cleanup

### Lane 2: backend integrity

- transactional migration
- canonical selectors
- uniqueness and replay behavior
- legacy plannedMeals policy

### Lane 3: imports/integrations

- localDay normalization
- Day One stable dedupe
- remote fetch policy
- best-effort cache writes

### Lane 4: CI/test/release

- E2E seed fix
- required merge gates
- coverage enforcement
- release workflow hardening
- DAST/Snyk repair

### Lane 5: architecture

- review recomputation queue
- shared use-case extraction
- repository boundary design
- mirror freeze

### Lane 6: UX/product quality

- stale import preview fix
- mobile nav redesign
- real home surface
- dead-control and placeholder-copy audit

## Explicit non-goals for the first stabilization sprint

Do not do these first:

- full rewrite of the persistence layer
- generic “clean up the whole codebase”
- broad UI redesign before security/integrity fixes
- stateless auth migration
- second app/platform scope expansion

## Definition of done for “production-grade”

This repo is production-grade only when all of these are true:

- authentication fails closed in production
- all health data writes are behind authenticated, bounded, trusted routes
- import/migration flows are transactional and replay-safe
- no critical or high runtime dependency advisories remain unresolved without waiver
- no known false-green CI path remains
- E2E passes and is required
- release reuses merge proof gates
- review recomputation no longer punishes every write
- test runtime and production runtime share the same business logic
- first-run, mobile, and import UX no longer contain misleading states

## Next action

Start with a stabilization sprint covering:

1. fail-closed auth
2. trusted owner identity
3. body-size caps
4. E2E seed repair
5. transactional snapshot migration
6. canonical selectors for weekly plans and daily records
7. `localDay` normalization across import sources
8. required CI + smoke + operational gates

No broad refactor should start before those eight land.

## Engineering execution standard

These rules apply to all future code changes in this repository.

### TDD is mandatory

- No production code before a failing test exists for the target behavior.
- For every bug fix:
  - first add the narrow failing regression test
  - verify it fails for the right reason
  - then implement the smallest fix
- For every new behavior:
  - add the contract test first
  - then add the implementation

### Test expectations by change type

- Business-logic change:
  - required: focused unit test
  - required: edge-case test
- Route or request-contract change:
  - required: route/server test
  - required: auth/permissions/error-path test
- UI behavior change:
  - required: component test
  - required: empty/error/loading-state test if applicable
- User-visible workflow or integration change:
  - required: E2E regression or fixture-contract test
  - required: one unhappy-path or edge-path E2E

### Minimum definition of done for each PR

- failing test existed first
- happy path covered
- edge case covered
- user-visible workflow covered by E2E or explicit fixture-contract test
- docs and workflow assumptions updated if behavior changed

### Test hierarchy for this repo

- unit tests:
  - pure domain rules
  - use-case logic
  - canonical selector behavior
  - import dedupe and normalization
- route/server tests:
  - auth gates
  - control-plane access
  - request size limits
  - migration replay safety
- component tests:
  - page state honesty
  - disabled/dead controls
  - stale preview/reset behavior
- E2E:
  - end-to-end path for each critical user workflow
  - one negative path for each sensitive workflow

## Stabilization sprint: exact PR queue

This is the recommended first implementation wave.

### PR S1.1 `auth-fail-closed`

Goal:

- make production auth impossible to misconfigure open

Scope:

- replace current fail-open auth guard
- explicit public-route allowlist
- remove dotted-path auth bypass

Tests first:

- unit/route:
  - prod mode + missing auth config => request denied or app boot fails
  - explicit public routes remain reachable
  - non-public API route rejects unauthenticated request
  - dotted-path `+server.ts` route is not implicitly public
- E2E:
  - unauthenticated browser cannot enter protected app route
  - unauthenticated API write route denied

Depends on:

- none

Blocks:

- every other production-facing tranche

### PR S1.2 `trusted-owner-identity`

Goal:

- make SMART/FHIR import identity server-trusted

Scope:

- remove `ownerProfile` trust from request body
- load canonical owner identity from trusted server storage
- preview and commit use same trusted source

Tests first:

- unit/route:
  - body-supplied owner identity is ignored
  - missing server owner identity fails with clear error
  - mismatched clinical payload rejected
  - exact match accepted
- E2E:
  - configured owner can preview + commit correct SMART payload
  - forged owner identity cannot force import

Depends on:

- S1.1

### PR S1.3 `body-size-guards`

Goal:

- close obvious authenticated DoS lanes

Scope:

- import payload size caps
- migration snapshot size caps
- early rejection before full parse

Tests first:

- route tests:
  - oversize import rejected
  - oversize migration rejected
  - boundary-size valid payload accepted
- E2E:
  - large import fixture receives clear rejection

Depends on:

- S1.1

### PR S1.4 `e2e-seed-contract-fix`

Goal:

- make browser suite truthful again

Scope:

- centralize `/api/db/migrate` seeding helper
- pass required control-plane token

Tests first:

- fixture-contract test:
  - seeding helper fails if token missing
  - seeding helper succeeds with expected contract
- E2E:
  - at least one currently false-red spec rerun as proof

Depends on:

- none, but easiest after S1.1/S1.3 settle route policy

### PR S1.5 `transactional-migration`

Goal:

- make snapshot import atomic and replay-safe

Scope:

- one transaction for full snapshot import
- explicit conflict policy
- deterministic replay behavior

Tests first:

- server tests:
  - conflicting row causes full rollback
  - replay same snapshot is deterministic
  - partial failure does not leave mixed tables
- E2E or fixture-contract:
  - seed import can be replayed cleanly

Depends on:

- S1.4 preferred

### PR S1.6 `canonical-selectors`

Goal:

- remove first-row ambiguity

Scope:

- shared canonical selectors for `weeklyPlans` and `dailyRecords`
- unify review/today/plan behavior

Tests first:

- unit:
  - duplicate rows choose newest deterministic winner
  - same canonical selector reused by review/today/plan
- E2E:
  - duplicate-state fixture does not produce cross-page disagreement

Depends on:

- S1.5 preferred

### PR S1.7 `localday-normalization`

Goal:

- make day/week placement stable across import sources

Scope:

- all import paths derive `localDay` through one timezone-aware path

Tests first:

- unit:
  - same instant across HealthKit/XML/FHIR yields same `localDay`
  - midnight boundary cases pinned
- E2E:
  - import fixture near midnight lands on expected day in Today/Review

Depends on:

- none strictly, but fits after migration integrity work

### PR S1.8 `required-proof-gates`

Goal:

- make green actually mean something

Scope:

- require E2E
- require smoke
- require operational check
- wire coverage enforcement

Tests first:

- workflow/config tests:
  - CI config includes required jobs
  - release workflow depends on proof jobs

Depends on:

- S1.4 because E2E must be truthful first

## Parallelization map

Can run in parallel:

- S1.2 and S1.3
- S1.5 design prep and S1.8 workflow prep
- S1.7 unit-test authoring while S1.5 is in flight

Should serialize:

- S1.1 before most other production auth work
- S1.4 before making E2E required
- S1.5 before broad replay/integrity confidence claims
- S1.6 before review/today consistency cleanup claims

## First six worker prompts

Use these after the stabilization sprint is approved for execution.

### Worker 1: auth/security

Ownership:

- `src/lib/server/http/*`
- `src/hooks.server.ts`
- auth route/policy tests

Task:

- implement S1.1
- do not edit imports, review, or persistence logic
- add failing tests first

### Worker 2: trusted owner identity

Ownership:

- `src/lib/features/imports/contracts.ts`
- `src/routes/api/imports/+server.ts`
- `src/lib/server/imports/service.ts`
- trusted owner storage files

Task:

- implement S1.2
- add failing tests first
- do not edit unrelated auth/session code

### Worker 3: body-size + external request contract

Ownership:

- import and migration route validation
- related route tests

Task:

- implement S1.3
- add failing tests first
- keep scope on request bounds only

### Worker 4: E2E/CI truthfulness

Ownership:

- `tests/features/e2e/**`
- `tests/support/e2e/**`
- `.github/workflows/**`

Task:

- implement S1.4 and prepare S1.8
- add fixture-contract protection first
- do not change product logic unless seeding contract requires it

### Worker 5: migration/integrity

Ownership:

- `src/lib/server/db/drizzle/**`
- `src/routes/api/db/migrate/+server.ts`
- migration tests

Task:

- implement S1.5
- failing replay/rollback tests first

### Worker 6: canonical selectors + day normalization

Ownership:

- `src/lib/server/planning/store.ts`
- `src/lib/server/today/**`
- `src/lib/server/nutrition/**`
- `src/lib/server/sobriety/**`
- import normalization files

Task:

- implement S1.6 and S1.7 in separate commits
- failing selector/normalization tests first

## Immediate next step

Do not start Phase 4 architecture cleanup yet.

Start with:

1. S1.1 `auth-fail-closed`
2. S1.4 `e2e-seed-contract-fix`
3. S1.5 `transactional-migration`

Those three give the fastest safety and truthfulness gain.
