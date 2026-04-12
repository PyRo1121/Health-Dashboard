# Feature Flows

Status: Active  
Date: 2026-04-10

This file describes the user and data flows that matter most in the live app.

Use it when you need to answer:

- what a feature is supposed to do for the user
- which other features it depends on
- what data gets refreshed when a user action happens

## Core Product Loop

```text
Today
  -> Journal / Health / Nutrition / Sobriety / Assessments
  -> Timeline
  -> Review
  -> Plan
  -> back into Today
```

The app is not a dashboard full of disconnected tools.

It is a loop:

- log what is true today
- capture important context
- see the timeline of what happened
- review the week
- plan the next week
- use that plan inside Today again

## Today Loop

User goal:

- understand the current day quickly
- log the minimum useful truth
- act on today’s planned meal or workout

Flow:

```text
/today
  -> save check-in
  -> writes DailyRecord + HealthEvents
  -> refreshes weekly review artifacts
  -> reloads Today snapshot
```

Today also pulls:

- planned meal from planning/nutrition resolution
- planned workout from planning
- recovery adaptation from existing signals
- event stream from health events

Dependencies:

- planning
- nutrition
- health
- review

## Journal Loop

User goal:

- write a narrative entry with the right context attached

Flow:

```text
/journal
  -> load entries for local day
  -> load linked health events
  -> save entry
  -> reload entries + linked context rows
```

Journal can also hydrate from:

- Today recovery actions
- Review context links

Dependencies:

- health events
- review
- today

## Health Loop

User goal:

- log symptoms, anxiety, sleep context, and medication/supplement templates without friction

Flow:

```text
/health
  -> save symptom / anxiety / sleep note / template / template dose
  -> write health events or templates
  -> refresh weekly review artifacts
  -> reload health snapshot
```

Dependencies:

- review

## Nutrition Loop

User goal:

- search foods quickly
- save meals
- reuse recurring meals
- plan meals that feed Today and Review

Flow:

```text
/nutrition
  -> search food / packaged / recipe
  -> select or enrich result
  -> save meal / recurring meal / catalog item / planned meal
  -> optional review refresh
  -> reload nutrition page state
```

Nutrition depends on:

- food catalog
- recipe catalog
- favorite meals
- planned-meal resolution
- review refresh

Dependencies:

- planning
- review
- today

## Sobriety Loop

User goal:

- mark status
- log cravings
- capture lapse context without shame

Flow:

```text
/sobriety
  -> mark sober/recovery
  -> save craving
  -> save lapse
  -> refresh weekly review artifacts
  -> reload sobriety summary
```

Dependencies:

- review

## Assessments Loop

User goal:

- save structured progress
- submit an assessment
- get safety-aware feedback

Flow:

```text
/assessments
  -> load latest assessment for selected instrument
  -> save draft progress
  -> submit complete assessment
  -> refresh weekly review artifacts
  -> update local assessment state and safety messaging
```

Dependencies:

- review

## Timeline Loop

User goal:

- inspect cross-source event history
- verify imported or manual events actually landed

Flow:

```text
/timeline
  -> load normalized event items from local DB
  -> filter by source or event type
```

Timeline is the proof surface. If data is missing here, imports and manual logging are not trustworthy.

Dependencies:

- health
- imports
- today
- sobriety

## Review Loop

User goal:

- understand what moved this week
- see correlations and adherence signals
- carry an experiment into next week

Flow:

```text
/review
  -> build weekly snapshot from canonical data
  -> read/write review snapshot
  -> show trends, adherence, context, device highlights, journal excerpts
  -> save next-week experiment
```

Review depends on nearly everything:

- today
- journal
- health
- nutrition
- planning
- groceries
- sobriety
- assessments
- imports

This is why so many mutations refresh weekly review artifacts.

## Planning Loop

User goal:

- build a weekly plan that can actually be executed

Flow:

```text
/plan
  -> create weekly plan if missing
  -> save/move/delete slots
  -> save workout templates
  -> toggle grocery state
  -> add/remove manual grocery items
  -> refresh review artifacts
  -> reload planning page state
```

Dependencies:

- movement
- nutrition
- groceries
- review
- today

## Groceries Loop

User goal:

- get a usable grocery checklist from the plan
- merge manual items with derived rows

Flow:

```text
/groceries
  -> load weekly plan
  -> derive grocery rows from recipe-backed slots
  -> merge manual rows
  -> toggle or edit items
  -> refresh review artifacts
  -> reload grocery page
```

Dependencies:

- planning
- nutrition
- review

## Imports Loop

User goal:

- preview imported data before it lands
- trust the resulting timeline

Flow:

```text
/imports
  -> infer source type
  -> analyze payload
  -> preview import
  -> stage artifacts
  -> commit import
  -> materialize health/journal data
  -> refresh weekly review for affected days
```

Dependencies:

- integrations
- timeline
- review

## Integrations Loop

User goal:

- understand what import paths exist
- see connection status
- jump into import center

Flow:

```text
/integrations
  -> load connection summary from local imported/native data
  -> expose shortcut kit and import handoff
```

Dependencies:

- imports
- native companion guidance

## Settings Loop

User goal:

- configure owner profile
- understand local-first posture
- access setup paths

Dependencies:

- imports
- integrations

## Failure Mode Rule

If a cleanup touches any mutation path in:

- today
- health
- nutrition
- planning
- groceries
- sobriety
- assessments
- journal
- imports

then review regressions are possible and should be treated as part of the proof burden.
