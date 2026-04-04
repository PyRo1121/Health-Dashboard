# Health Cockpit iPhone Companion

This workspace is the iPhone-first `T9` proof of concept for the Personal Health Cockpit.

Scope:
- request HealthKit read access
- export a local JSON bundle for the web app
- only include the first three passive metrics:
  - `sleep-duration`
  - `step-count`
  - `resting-heart-rate`
- support two export paths:
  - `Daily snapshot`
  - `Changes since last export`

The generated bundle matches the web bridge contract in:
- `/src/lib/domain/types.ts`
- `/src/lib/integrations/bridge/schema.ts`
- `/src/lib/integrations/bridge/validate.ts`

Current query approach:
- snapshot exports use Swift-concurrency HealthKit descriptors for one-shot reads
- incremental exports use anchored object query descriptors so the app can export only new samples after the previous export

Why:
- Apple’s HealthKit docs recommend sample queries for snapshots and anchored object queries for changes
- the anchored path is the right production lane for keeping bundle exports small as the user keeps using the app

## Generate the Xcode project

This scaffold uses XcodeGen so the repo can hold source and target config without a checked-in `.xcodeproj`.

1. Install XcodeGen on your Mac.
2. Run `xcodegen generate` inside `apps/ios-companion`.
3. Open the generated `HealthCockpitCompanion.xcodeproj`.
4. Configure signing and the HealthKit entitlement in Xcode.
5. Run on a physical iPhone. HealthKit background/server queries are not supported on Simulator.

## Required iOS setup

- Add the HealthKit capability to the app target.
- Confirm `NSHealthShareUsageDescription` matches your release copy.
- Use a real device for end-to-end HealthKit verification.

## Handoff flow

1. Tap `Request Health Access`.
2. Tap `Export Today Bundle`.
3. Share the JSON file out of the app.
4. Paste the JSON into `/imports` in the web app and commit it.
