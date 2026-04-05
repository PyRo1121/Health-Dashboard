# Health Integration Options

Date: 2026-04-02
Scope: personal health cockpit, local-first, single user

## Executive Take

Do not build ten custom integrations first.

Build one clean ingestion architecture, then plug the right sources into it in order of leverage.

The best order is:

1. Manual entry and CSV import
2. Apple Health XML import
3. Day One JSON import for journaling
4. Android Health Connect and Apple Health native companion sync
5. Epic/MyChart and payer FHIR access
6. Direct wearable APIs only if you personally use one heavily

That is the whole strategy.

## Integration Tiers

### Tier 1: Must support in the product shape

These matter enough that the architecture should assume them now, even if implementation comes later.

- Apple Health
- Android Health Connect
- Clinical records / patient portal data
- Journaling import + native journaling UX
- Food data enrichment

### Tier 2: Nice if you personally use them

- Garmin
- Fitbit
- WHOOP
- Withings

These are useful, but they are optional if Apple Health or Health Connect already aggregate the same data for you.

### Tier 3: Avoid in early versions

- Deep bidirectional write-back into EHRs
- Multi-provider scheduling or messaging
- Fragile scraping of portals
- Cloud sync before local value is proven

## Integration Matrix

| Source                           | Access path                     | What you get                                                              | Web-only?                   | Friction    | MVP recommendation    |
| -------------------------------- | ------------------------------- | ------------------------------------------------------------------------- | --------------------------- | ----------- | --------------------- |
| Apple Health                     | XML export import               | workouts, vitals, sleep, meds, state of mind, more                        | Yes                         | Low         | Yes                   |
| Apple Health                     | HealthKit native companion      | structured read/write with permissions                                    | No, iOS native required     | Medium      | Later                 |
| Apple Health Records             | via HealthKit clinical records  | meds, labs, immunizations, notes, vitals, coverage as FHIR-backed records | No, iOS native required     | High        | Later                 |
| Apple Health Share with Provider | Apple-managed provider sharing  | provider-facing sharing, not your app data ownership                      | No                          | High        | Reference only        |
| Android Health Connect           | native Android SDK              | wellness, mindfulness, medical records in FHIR                            | No, Android native required | Medium      | Later                 |
| MyChart / Epic                   | SMART on FHIR patient app       | patient-authorized clinical data via OAuth + FHIR                         | Yes                         | High        | Later, but design now |
| Blue Button 2.0                  | Medicare patient OAuth + FHIR   | Medicare claims, coverage, prescriptions                                  | Yes                         | Medium      | Nice optional later   |
| USDA FoodData Central            | REST API / downloads            | nutrient search and enrichment                                            | Yes                         | Low         | Yes                   |
| Day One                          | JSON export import              | journal entries + media metadata                                          | Yes                         | Low         | Yes                   |
| Garmin                           | approved developer program APIs | steps, sleep, stress, activities, women’s health                          | Yes                         | Medium/High | Optional later        |
| Fitbit                           | OAuth API                       | activity, sleep, heart, body                                              | Yes                         | Medium      | Optional later        |
| WHOOP                            | OAuth API                       | sleep, recovery, strain, workouts                                         | Yes                         | Medium      | Optional later        |
| Withings                         | public API / SDK                | scale, BP, sleep, biometrics                                              | Yes                         | Medium      | Optional later        |

## Best Option By Category

### Apple users

Best starter option:

- Import Apple Health XML first

Best long-term option:

- iOS companion app with HealthKit

Why:

- Apple already aggregates device and app data
- export path exists now
- native HealthKit path is powerful but not available to a pure web app

Evidence:

- Apple Support says Health data can be exported in XML format from the Health app.
- Apple Developer docs show HealthKit requires native app entitlements and fine-grained authorization.
- HealthKit clinical records are read-only and backed by FHIR resources.

### Android users

Best starter option:

- file import if available, plus manual logging

Best long-term option:

- Android companion app using Health Connect

Why:

- Health Connect is the Android-native aggregation point
- it now covers wellness, mindfulness, and medical records in FHIR
- pure web cannot talk to it directly

Evidence:

- Android Developers say Health Connect stores structured health data and provides mindfulness plus medical records support.
- Medical Records in Health Connect use FHIR R4 / R4B and support patient, observation, immunization, condition, procedure, and related resources.

### Clinical records / patient portals

Best starter option:

- import clinical files if the user can export them
- treat provider data as read-only timeline evidence

Best long-term option:

- SMART on FHIR patient-facing app connection, starting with Epic / MyChart-compatible flows

Why:

- this is the right standard
- this is also a setup and approval swamp if you start here
- patient portal interop is worth designing for, but not worth blocking v1 on

Evidence:

- Epic documents patient-facing consumer health apps using OAuth2 with MyChart credentials and FHIR APIs.
- Epic also says apps must register, receive client records, and distribute client IDs to customer environments.
- Some write workflows such as Observation.Create require active MyChart accounts and specific app registration.

### Claims / payer data

Best starter option:

- skip unless you personally have a Medicare use case

Best long-term option:

- Blue Button 2.0 if relevant

Why:

- It is high-value for longitudinal claims history, but only for a subset of users.

Evidence:

- CMS Blue Button 2.0 exposes Medicare claims through FHIR and OAuth.
- CMS explicitly describes ongoing personal health aggregator apps with 13-month user authorization windows.

### Food data

Best starter option:

- USDA FoodData Central for nutrient enrichment
- your own recurring-meal layer on top

Why:

- public-domain data
- strong source quality
- enough for real nutrition tracking without getting cute

Evidence:

- USDA FoodData Central offers API and downloadable JSON/CSV data.
- Default rate limit is 1,000 requests per hour per IP.

### Best free nutrition stack

For this app specifically, the best free stack is:

1. **USDA FoodData Central** for canonical nutrient data
2. **Open Food Facts** for packaged-food and barcode fallback
3. **local normalized cache** as the actual app-facing source after lookup

Why:

- USDA gives the best free official nutrient depth
- Open Food Facts gives the best free packaged-food convenience layer
- local cache preserves the product's local-first and offline-friendly nature

#### Recommended role split

##### USDA FoodData Central

Use for:

- generic food search
- recurring meal nutrient resolution
- micronutrient detail
- weekly nutrient gap analysis

##### Open Food Facts

Use for:

- barcode lookup
- branded packaged foods
- convenience metadata for packaged items

#### Product rule

The upstream APIs are lookup sources, not runtime dependencies for repeated logging.

Once a food is resolved, the app should normalize it locally, cache it locally, and prefer the corrected local version on future reuse.

### Journaling

Best starter option:

- first-party journaling inside your app
- optional Day One JSON import

Why:

- journaling is not a side table, it is part of the causal graph
- you want entries linked to sleep, food, cravings, mood, and experiments
- importing existing history reduces cold start pain

Evidence:

- Day One supports JSON exports with entry payloads and optional media folders.

## What World-Class Looks Like

World-class here does not mean "supports every API."

It means:

1. The app has one canonical event model.
2. Every ingestion source maps into that model with provenance.
3. You never lose raw source payloads.
4. Imported data can be reconciled, deduped, and reprocessed.
5. A failed integration never corrupts your daily timeline.

## Canonical Ingestion Model

Every source should land as one of these:

- biometric_event
- activity_event
- sleep_event
- food_event
- medication_event
- sobriety_event
- journal_entry
- assessment_result
- clinical_record
- import_artifact

Each event should carry:

- source_type
- source_app
- source_record_id
- source_timestamp
- timezone
- unit
- normalized payload
- raw payload reference
- confidence
- import_batch_id

That model is the platform.

## Journaling Recommendation

The first plan underplayed journaling. That was a mistake.

Journaling needs its own clean home.

Recommended structure:

- `Journal` route for long-form entries
- `Today` route for quick prompts
- each entry can optionally link to:
  - a craving
  - a meal
  - a symptom
  - a workout
  - a mood swing
  - an experiment

Entry types:

- freeform
- structured daily reflection
- lapse/craving note
- symptom note
- experiment note
- provider visit reflection

## Mental-Health Assessment Recommendation

Do not make PHQ-9 and GAD-7 daily habits.

That is bad UX and bad measurement.

Recommended cadence:

- Daily:
  - mood
  - energy
  - stress
  - focus
  - short optional note
- Weekly:
  - WHO-5 or similar lightweight wellbeing check
- Monthly or on-demand:
  - PHQ-9
  - GAD-7
- Sobriety specific:
  - daily craving score
  - lapse context
  - optional monthly AUDIT-C or AUDIT-style review

Safety rule:

If you include PHQ-9 item 9 or any self-harm-adjacent signal, the app must display crisis guidance and explicitly state it is not emergency care.

## Direct Wearable APIs: Worth It Or Not?

### Recommendation

Do not start with direct wearable APIs unless one of these is true:

- you rely on that wearable daily
- Apple Health / Health Connect does not preserve the metric you care about
- the wearable exposes a metric that meaningfully changes your weekly decision loop

Examples:

- Garmin can be worth it for training load and women’s health details.
- WHOOP can be worth it if recovery and strain are central to your routine.
- Withings can be worth it if weight, body composition, or blood pressure are core.

But default architecture should still prefer:

- Apple Health on Apple devices
- Health Connect on Android

Aggregator first. Vendor-specific second.

## Engineering Recommendation

### V1

- local-first web app
- manual entry
- Apple Health XML import
- Day One import
- USDA food enrichment
- strong journaling
- assessment system

### V2

- native iOS HealthKit companion
- native Android Health Connect companion
- FHIR import pipeline
- Epic/MyChart SMART on FHIR proof of concept

### V3

- direct wearable integrations for the devices you actually use
- payer and claims integrations where relevant

## Sources

- Apple Support, Health data export and sharing:
  - https://support.apple.com/108323
  - https://support.apple.com/105016
  - https://support.apple.com/guide/iphone/iphbb8259c61/ios
  - https://support.apple.com/guide/iphone/iphc30019594/ios
- Apple Developer, HealthKit and clinical records:
  - https://developer.apple.com/documentation/healthkit
  - https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data
  - https://developer.apple.com/documentation/healthkit/hkclinicaltypeidentifier
  - https://developer.apple.com/documentation/healthkit/hkclinicalrecord
- Android Developers, Health Connect:
  - https://developer.android.com/health-and-fitness/guides/health-connect/overview
  - https://developer.android.com/health-and-fitness/guides/health-connect/medical-records
  - https://developer.android.com/health-and-fitness/health-connect/medical-records/data-format
  - https://developer.android.com/health-and-fitness/guides/health-connect/develop/mindfulness
- Epic on FHIR:
  - https://fhir.epic.com/
  - https://fhir.epic.com/Documentation
- SMART on FHIR:
  - https://docs.smarthealthit.org/
  - https://docs.smarthealthit.org/authorization/best-practices
- CMS Blue Button 2.0:
  - https://bluebutton.cms.gov/api-documentation/
- USDA FoodData Central:
  - https://fdc.nal.usda.gov/
  - https://fdc.nal.usda.gov/api-guide
  - https://fdc.nal.usda.gov/download-datasets/
- Mental health and alcohol instruments:
  - https://integrationacademy.ahrq.gov/resources/7671
  - https://integrationacademy.ahrq.gov/sites/default/files/2020-07/GAD-7.pdf
  - https://www.who.int/substance_abuse/publications/audit/en/
- Journaling:
  - https://dayoneapp.com/guides/day-one-classic/upgrading-importing-from-day-one-classic/
- Local-first storage reference:
  - https://dexie.org/docs/index
