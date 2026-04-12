# External Data Sources

Status: Active  
Date: 2026-04-10

This file documents which external data sources fit the product, what their real constraints are, and how they should be used.

This matters because a local-first health app can still depend on bad assumptions about “free APIs” and quietly become fragile.

## Rule

External data sources are allowed when they do one of three jobs:

1. enrich local user actions
2. import external records into the local timeline
3. support developer and CI workflows

They should not become the sole owner of core product value.

## Current Position

The app should remain useful without:

- Apple Health
- Health Connect
- SMART on FHIR
- USDA
- Open Food Facts
- TheMealDB

Those are optional lanes, not the app’s reason to exist.

## Source Ranking

### Tier 1: Acceptable core enrichment / import lanes

- USDA FoodData Central
- Open Food Facts
- SMART on FHIR sandbox / standards references

### Tier 2: Useful but not strong enough as the whole product backbone

- TheMealDB
- ad hoc public recipe datasets

### Tier 3: Strategic future platform lanes, not required now

- Apple HealthKit / Health Records
- Android Health Connect

## USDA FoodData Central

Role in this product:

- nutrition lookup enrichment
- detail fetch by FDC ID
- optional live search

Current documented constraints:

- requires a data.gov API key for normal use
- default rate limit is `1,000 requests/hour/IP`
- public-domain data, but the API key must not be exposed publicly

Product implication:

- use USDA as an enrichment lane, not the only nutrition path
- keep local nutrition logging and local catalog useful without USDA
- treat missing USDA keys as a graceful-degradation case, not a fatal product error

Reference:

- USDA FoodData Central API Guide: https://fdc.nal.usda.gov/api-guide

## Open Food Facts

Role in this product:

- packaged-food search
- barcode lookup and enrichment

Current documented constraints:

- API v2 is current production API
- rate limits apply:
  - `100 req/min` for product reads
  - `10 req/min` for search
  - `2 req/min` for facet queries
- custom `User-Agent` is explicitly requested
- data quality is community-generated and not guaranteed to be complete or perfectly reliable

Product implication:

- Open Food Facts is good for packaged lookup, but results should be treated as useful external input, not perfect truth
- do not design search-as-you-type against OFF search
- cache normalized results locally
- keep local catalog and fallback behavior strong
- document the custom `User-Agent` requirement in any future production client that talks to OFF directly

References:

- API introduction: https://openfoodfacts.github.io/openfoodfacts-server/api/
- API tutorial: https://openfoodfacts.github.io/openfoodfacts-server/api/tutorial-off-api/

## TheMealDB

Role in this product:

- recipe discovery / lightweight recipe catalog seed

Current documented constraints:

- public test key `1` is available for development and educational use
- premium/supporter access unlocks more capabilities
- commercial/public release usage should not assume the free test-key posture is the long-term production contract

Product implication:

- TheMealDB is fine for local development, prototyping, and seeding recipe flows
- it is not strong enough to be the sole long-term recipe backbone for a serious health product
- if recipe discovery becomes core to the product, move to:
  - local cache first
  - stronger ingestion pipeline
  - explicit production support path

References:

- API docs: https://www.themealdb.com/api.php
- FAQ: https://www.themealdb.com/faq.php

## SMART on FHIR

Role in this product:

- future clinical import and sandbox validation lane

Current documented constraints:

- security-first standards posture
- TLS required
- explicit authorization scope handling
- refresh token and access token handling need discipline

Product implication:

- use SMART for standards-aligned future clinical import
- do not promise broad provider portal behavior
- keep clinical import narrow, explicit, and provenance-heavy

Reference:

- SMART on FHIR authorization best practices: https://docs.smarthealthit.org/authorization/best-practices/

## Apple Health / Health Connect

Role in this product:

- future device and health-record import lanes

Current product posture:

- not required for the core product loop
- should remain optional
- should feed the local timeline and review system, not replace it

That means:

- do not make the white paper or core app docs sound dependent on Apple Health
- keep the product valuable with manual logging + imports + review even if native platform integrations never land

## Best-Practice Rules For This Repo

### Good

- local-first by default
- external APIs enrich or import into local records
- explicit rate-limit and auth assumptions
- local caching where appropriate
- graceful degradation when credentials are missing

### Bad

- treating “free API” as “production-grade forever”
- assuming community data is canonical truth
- using remote search as the only path for a core user flow
- burying API constraints in code instead of docs

## Current Source-Of-Truth Position

For this project:

- Apple Health and Health Connect are future optional lanes
- USDA and Open Food Facts are valid external enrichment lanes
- TheMealDB is acceptable as a seed/discovery lane, but not a strong sole long-term production dependency
- the core app value remains:
  - daily truth capture
  - local timeline
  - weekly review
  - planning and execution loop

If that changes, update this file and the white paper together.
