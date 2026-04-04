# Health Dashboard Landscape Notes

Date: 2026-04-02
Scope: personal, local-first health dashboard for one user

## The Big Reframe

You do not want "a dashboard."

You want a personal health operating system.

The dashboard is just the readout. The real product is the loop:

1. Capture what happened with almost no friction.
2. Normalize scattered data into one personal timeline.
3. Surface drift early.
4. Help you decide what to change next week.

That is the whole game.

## What The Market Already Got Right

### 1. Privacy is not a feature, it is the trust model

Recent health products keep moving toward local processing and privacy-preserving analysis. That is not aesthetic. Health data is unusually sensitive, and users know it.

Implication:
- Build local-first from day one.
- Treat cloud sync as optional and late, not foundational.
- Keep raw data exportable and user-owned.

### 2. Food tracking wins when it is deep, fast, and boring

The best nutrition products are not "inspirational." They are reliable. Users come back when search is fast, recurring meals are easy, and nutrient data is trustworthy.

Implication:
- Favor a clean recurring-meal workflow over fancy meal AI first.
- Support both quick macros and deeper micronutrient views.
- Preserve source provenance for imported food data.

### 3. Mood tracking wins when logging takes seconds, not minutes

Successful mood apps reduce input burden hard. Tap-based mood capture, tags, and short notes beat big journaling prompts for daily adherence.

Implication:
- Daily mental-health capture should be 10 seconds or less.
- Separate "quick check-in" from "long-form reflection."
- Make streaks and consistency visible without becoming gamified sludge.

### 4. Sobriety products work because they create a ritual

The useful patterns are simple: daily pledge/check-in, streak visibility, trigger logging, lapse journaling without shame, and immediate context after a rough day.

Implication:
- Track sobriety as a behavior system, not just a counter.
- Log cravings, triggers, and recovery actions, not only lapse/no-lapse.
- Preserve context around a lapse so the system is useful the next morning.

### 5. "Health" is a correlation problem

Users do not actually want five separate trackers. They want to know things like:

- Does sleep quality predict cravings tomorrow?
- Does high-protein lunch improve evening mood stability?
- Does caffeine after noon hurt sleep enough to affect sobriety risk?

Implication:
- The product needs a unified daily timeline.
- Weekly review and cross-domain correlation are core, not polish.
- Imported data matters only if it feeds decisions.

## Product Signals From Existing Ecosystems

### Apple Health / device ecosystems

Apple Health has already trained users to expect privacy, device aggregation, and longitudinal trends. Even if you never integrate directly at first, your app should feel compatible with that mental model.

### Android / Health Connect

Android's health data direction also points toward centralized, user-controlled aggregation rather than every app becoming its own locked silo.

### USDA nutrition data

USDA FoodData Central is a credible base source for nutrition search and enrichment. That matters because bad food data kills trust fast.

### WHO-5 and similar well-being instruments

Validated mental-wellbeing questionnaires are useful as optional weekly review instruments, not daily diagnostic theater.

### NIAAA standard drink framing

If alcohol is tracked, standard drinks matter. Free-text "a couple drinks" is garbage data.

## Recommended Product Principles

1. Local-first, export-friendly, no cloud dependency in v1.
2. Manual-first, imports second, full live integrations later.
3. Daily capture must be faster than opening three separate apps.
4. Weekly review is the product moat.
5. Correlation beats raw metrics volume.
6. No diagnosis, no fake medical certainty, no therapy cosplay.
7. AI should summarize patterns later, not invent the core workflow.

## What To Borrow, What To Avoid

### Borrow

- Fast tap-based daily logging from mood trackers.
- Nutrient depth and recurring meals from serious food trackers.
- Streak + trigger logging from sobriety apps.
- Health ecosystem expectation of privacy and exportability.

### Avoid

- Forcing every metric every day.
- Generic "wellness score" nonsense.
- Cloud-first auth and sync before single-user value exists.
- AI coach screens before the base data model is trustworthy.
- Massive integration work before you prove the weekly review loop matters.

## The Product You Should Actually Build

The right starter version is:

- a local-first Svelte app
- with one unified daily record
- one frictionless food workflow
- one sobriety ritual
- one fast mood/energy check-in
- one weekly review page that tells you what moved

Not a quantified-self cathedral on day one.

But not a toy either.

## Source Notes

- OpenAI Codex docs on skills/config for local Codex behavior: https://developers.openai.com/codex/config-reference/
- Axios on Oura's local/private AI direction (privacy signal): https://www.axios.com/2025/02/04/oura-ai-local-device-data
- USDA FoodData Central ecosystem reference: https://fdc.nal.usda.gov/
- WHO-5 background via PubMed review: https://pubmed.ncbi.nlm.nih.gov/40506676/
- NIAAA alcohol tools and standard drink guidance: https://www.niaaa.nih.gov/
- Daylio product pattern reference: https://daylio.net/
- Cronometer product pattern reference: https://cronometer.com/
- I Am Sober product pattern reference: https://iamsober.com/
