# Lifestyle Loop API Options

Date: 2026-04-03  
Scope: world-class local-first health, nutrition, workout, recipe, media, and grocery planning

## Executive Take

If you want this app to beat the current field, do not try to win with "more APIs."

Win by closing the loop competitors keep splitting apart:

1. plan meals
2. plan workouts
3. generate groceries automatically
4. execute the day with low friction
5. review what actually worked

That is the product.

The API stack should support that loop, not define it.

## The Competitive Gaps

### What nutrition leaders already do well

- **Cronometer**
  - wins on accurate nutrient depth, barcode convenience, and micronutrients
  - official site says it tracks up to 84 nutrients and offers a free barcode scanner
  - source: https://cronometer.com/features/track-food.html
- **MacroFactor**
  - wins on adaptive coaching and fast logging
  - official site says it adapts macros to your metabolism and supports fast logging, barcode, recipe import, and photo logging
  - source: https://macrofactor.com/macrofactor/

### What workout leaders already do well

- **Hevy**
  - wins on routine building, workout progress, and exercise media
  - official site says it is a free workout tracker, supports routines, exercise videos, progress charts, and history
  - source: https://www.hevyapp.com/

### What meal planning leaders already do well

- **AnyList**
  - wins on calendar-first meal planning and auto-generated grocery lists
  - official site says you can add recipes to a meal planning calendar and generate grocery lists from a date range
  - source: https://www.anylist.com/meal-planning

## What they do not do well together

- Cronometer is deep, but it is not your weekly planner.
- MacroFactor is smart, but it is paid and still nutrition-first.
- Hevy is strong for lifting, but it is not tied to groceries or your food execution.
- AnyList is great for groceries, but it is not tied to recovery, mood, nutrition depth, or review.

That is your wedge.

## Recommended Free API Stack

### 1. Open Food Facts

Best for:

- packaged-food search
- barcode lookup
- branded product images
- ingredient text, labels, allergens, packaging metadata

Why it fits:

- official API docs are open and current
- read paths are public
- product images are already part of the product record

Important constraints:

- official docs currently rate-limit product reads at `100 req/min`
- official docs currently rate-limit search queries at `10 req/min`
- official docs explicitly say not to use search like search-as-you-type

Sources:

- https://openfoodfacts.github.io/openfoodfacts-server/api/
- https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/

Recommendation:

- use it for barcode and packaged lookup
- cache aggressively
- do not build your UX around live OFF search latency

### 2. USDA FoodData Central

Best for:

- canonical nutrient truth
- generic food lookup
- micronutrients
- weekly nutrient-gap analysis

Why it fits:

- official
- public-domain data
- strong nutrient coverage

Important constraints:

- requires a `data.gov` API key
- official docs currently state `1,000 requests/hour per IP`
- `DEMO_KEY` exists for exploration only

Source:

- https://fdc.nal.usda.gov/api-guide

Recommendation:

- keep USDA as the nutrient authority
- never make repeated food logging depend on live USDA calls
- enrich once, then store locally

### 3. TheMealDB

Best for:

- lightweight recipe bootstrap
- meal thumbnails
- ingredient thumbnails
- category / cuisine discovery

Why it fits:

- lowest-friction free recipe source
- image layer is unusually useful for a local-first meal planner

Important constraints:

- official API page says test key `1` is fine for development and educational use
- official FAQ says public/commercial apps are expected to move to supporter/commercial tiers
- that means it is excellent for bootstrap, weak as a forever-core dependency

Sources:

- https://www.themealdb.com/api.php
- https://www.themealdb.com/faq.php

Recommendation:

- use it to seed recipe discovery and thumbnails
- cache recipes locally
- do not make it the permanent canonical recipe backend

### 4. wger

Best for:

- structured exercise library
- workout routines
- basic workout programming objects
- free exercise-domain bootstrap without paying RapidAPI middlemen

Why it fits:

- official docs say public endpoints like exercises and ingredients can be accessed without authentication
- routines exist as first-class API objects when you do want authenticated user-owned plans

Important constraints:

- docs are more developer-oriented than polished product docs
- media support is less straightforward than food image sources
- good exercise substrate, not a drop-in full workout-media product

Sources:

- https://wger.readthedocs.io/en/latest/api/api.html
- https://wger.readthedocs.io/en/latest/api/routines.html

Recommendation:

- use wger for exercise and routine structure
- keep your own local workout plan and session model
- treat wger media as optional bonus, not core dependency

## Optional Media APIs

These are optional polish APIs, not core product dependencies.

### Pexels

Best for:

- generic workout or grocery hero imagery
- occasional exercise/food mood visuals
- optional short-form stock video

Constraints:

- requires API key
- official docs currently say default limits are `200 requests/hour` and `20,000 requests/month`
- attribution/linking expectations apply

Source:

- https://www.pexels.com/api/documentation/

Verdict:

- useful for editorial polish
- not useful as the product's food-image backbone

### Unsplash

Best for:

- high-quality editorial food or wellness photography

Constraints:

- requires developer registration and access key
- official docs currently say demo mode starts at `50 requests/hour`
- hotlinking and attribution rules apply

Source:

- https://unsplash.com/documentation

Verdict:

- good for ambient visuals
- wrong choice for recipe/product images you actually depend on

### YouTube Data API

Best for:

- video discovery when you really need search

Constraints:

- requires Google API setup
- official docs say `search.list` costs `100` quota units per call

Source:

- https://developers.google.com/youtube/v3/docs/search/list

Verdict:

- too expensive in quota terms for "find workout videos on the fly"
- better to use curated links, embedded known videos, or your own cached references

## Pictures and Video Strategy

Use source-bound media first.

That means:

1. packaged foods get their images from Open Food Facts
2. recipes get their images from TheMealDB
3. ingredients get thumbnails from TheMealDB when available
4. workouts get structured movement data from wger
5. only use Pexels or Unsplash for editorial polish, not operational content

Why:

- source-bound media is trustworthy
- it is tied to the actual item
- it avoids random pretty stock-photo nonsense

## Grocery List Strategy

Do not look for a grocery list API.

That would be a mistake.

The right grocery engine is local and deterministic:

1. recipes and planned meals create ingredient lines
2. duplicate ingredients merge locally
3. quantities aggregate locally
4. aisle/category grouping is a local rule layer
5. pantry/exclude toggles are local state
6. shopping completion is local state

This is better because:

- it works offline
- it stays tied to your real plan
- it is explainable
- it does not create another third-party dependency

## API Architecture Recommendation

```text
                        FREE CORE STACK

  Open Food Facts  ---> packaged foods + barcode + product photos
  USDA FDC         ---> nutrient truth + micronutrients
  TheMealDB        ---> recipe bootstrap + recipe photos + ingredient thumbs
  wger             ---> exercise library + routine primitives

                              |
                              v

                    local normalization layer
                              |
                              v

                SQLite-backed canonical local objects
                              |
        +---------------------+----------------------+
        |                     |                      |
        v                     v                      v
   weekly planner        grocery engine        today/review loop
```

## Final Recommendation

For a world-class but sane version of this product:

- **must use**: Open Food Facts, USDA FDC, TheMealDB, wger
- **should build locally**: grocery lists, planning calendar, review scoring, adherence logic
- **should avoid as core dependencies**: YouTube Data API, Pexels, Unsplash
- **may use later for polish**: Pexels or Unsplash

That gives you a free or mostly-free stack that is actually defensible.

Not just "many APIs."

## Sources

- Open Food Facts API docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
- Open Food Facts docs overview: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/
- USDA FoodData Central API Guide: https://fdc.nal.usda.gov/api-guide
- TheMealDB API: https://www.themealdb.com/api.php
- TheMealDB FAQ: https://www.themealdb.com/faq.php
- wger API docs: https://wger.readthedocs.io/en/latest/api/api.html
- wger routine docs: https://wger.readthedocs.io/en/latest/api/routines.html
- Pexels API docs: https://www.pexels.com/api/documentation/
- Unsplash API docs: https://unsplash.com/documentation
- YouTube Data API search docs: https://developers.google.com/youtube/v3/docs/search/list
- Cronometer track food: https://cronometer.com/features/track-food.html
- MacroFactor product page: https://macrofactor.com/macrofactor/
- Hevy product page: https://www.hevyapp.com/
- AnyList meal planning: https://www.anylist.com/meal-planning
