import Foundation
import HealthKit
import UIKit

protocol HealthKitBundleExporting {
	func exportBundle(for day: Date, mode: HealthKitExportMode) async throws -> HealthKitBridgeBundleExportResult
}

enum HealthKitBundleExportError: LocalizedError, Equatable {
	case emptyBundle

	var errorDescription: String? {
		switch self {
		case .emptyBundle:
			return "No matching HealthKit samples were available for this export."
		}
	}
}

struct HealthKitBridgeBundleExportResult {
	let bundle: HealthKitBridgeBundle
	private let anchorCommits: [() -> Void]

	init(bundle: HealthKitBridgeBundle, anchorCommits: [() -> Void]) {
		self.bundle = bundle
		self.anchorCommits = anchorCommits
	}

	func commitAnchors() {
		for commit in anchorCommits {
			commit()
		}
	}
}

struct HealthKitBundleExporter: HealthKitBundleExporting {
	private let healthStore: HKHealthStore
	private let calendar: Calendar
	private let timeZone: TimeZone
	private let iso8601Formatter: ISO8601DateFormatter
	private let anchorStore: HealthKitAnchorStoring

	init(
		healthStore: HKHealthStore = HKHealthStore(),
		calendar: Calendar = .autoupdatingCurrent,
		timeZone: TimeZone = .autoupdatingCurrent,
		anchorStore: HealthKitAnchorStoring = HealthKitAnchorStore()
	) {
		self.healthStore = healthStore
		var calendar = calendar
		calendar.timeZone = timeZone
		self.calendar = calendar
		self.timeZone = timeZone
		self.anchorStore = anchorStore
		let formatter = ISO8601DateFormatter()
		formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
		self.iso8601Formatter = formatter
	}

	func exportBundle(for day: Date, mode: HealthKitExportMode) async throws -> HealthKitBridgeBundleExportResult {
		let dayWindow = DayWindow(day: day, calendar: calendar)
		let records: [HealthKitBridgeRecord]
		let anchorCommits: [() -> Void]

		switch mode {
		case .dailySnapshot:
			async let sleep = sleepRecord(for: dayWindow)
			async let steps = stepCountRecord(for: dayWindow)
			async let restingHeartRate = restingHeartRateRecord(for: dayWindow)

			let sleepRecord = try await sleep
			let stepRecord = try await steps
			let restingHeartRateRecord = try await restingHeartRate
			records = [sleepRecord, stepRecord, restingHeartRateRecord].compactMap { $0 }
			anchorCommits = []
		case .incrementalChanges:
			let incremental = try await incrementalRecords(for: dayWindow)
			records = incremental.records
			anchorCommits = incremental.anchorCommits
		}

		guard !records.isEmpty else {
			throw HealthKitBundleExportError.emptyBundle
		}

		let capturedAt = iso8601Formatter.string(from: .now)
		let bundle = HealthKitBridgeBundle.make(
			deviceId: UIDevice.current.identifierForVendor?.uuidString ?? UIDevice.current.name,
			deviceName: UIDevice.current.name,
			capturedAt: capturedAt,
			timezone: timeZone.identifier,
			records: records
		)

		return HealthKitBridgeBundleExportResult(bundle: bundle, anchorCommits: anchorCommits)
	}

	private func incrementalRecords(for dayWindow: DayWindow) async throws -> (records: [HealthKitBridgeRecord], anchorCommits: [() -> Void]) {
		async let sleep = incrementalSleepRecords(for: dayWindow)
		async let steps = incrementalQuantityRecords(
			for: .stepCount,
			metric: .stepCount,
			dayWindow: dayWindow,
			unit: .count()
		)
		async let restingHeartRate = incrementalQuantityRecords(
			for: .restingHeartRate,
			metric: .restingHeartRate,
			dayWindow: dayWindow,
			unit: HKUnit.count().unitDivided(by: HKUnit.minute())
		)

		let sleepResult = try await sleep
		let stepsResult = try await steps
		let restingHeartRateResult = try await restingHeartRate

		return (
			records: sleepResult.records + stepsResult.records + restingHeartRateResult.records,
			anchorCommits: sleepResult.anchorCommits + stepsResult.anchorCommits + restingHeartRateResult.anchorCommits
		)
	}

	private func sleepRecord(for dayWindow: DayWindow) async throws -> HealthKitBridgeRecord? {
		guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
			return nil
		}

		let predicate = HKQuery.predicateForSamples(
			withStart: dayWindow.start,
			end: dayWindow.end,
			options: []
		)
		let descriptor = HKSampleQueryDescriptor(
			predicates: [.categorySample(type: sleepType, predicate: predicate)],
			sortDescriptors: [SortDescriptor(\.endDate, order: .reverse)],
			limit: nil
		)

		let samples = try await descriptor.result(for: healthStore)
		let asleepValues: Set<Int> = [
			HKCategoryValueSleepAnalysis.asleepCore.rawValue,
			HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
			HKCategoryValueSleepAnalysis.asleepREM.rawValue,
			HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue
		]
		let asleepSamples = samples.filter { asleepValues.contains($0.value) }

		guard !asleepSamples.isEmpty else {
			return nil
		}

		let startAt = asleepSamples.map(\.startDate).min() ?? dayWindow.start
		let endAt = asleepSamples.map(\.endDate).max() ?? dayWindow.end
		let totalHours = asleepSamples.reduce(0.0) { partialResult, sample in
			partialResult + sample.endDate.timeIntervalSince(sample.startDate) / 3600
		}

		return HealthKitBridgeRecord(
			id: "sleep-\(dayWindow.localDay)",
			recordedAt: iso8601Formatter.string(from: endAt),
			metricType: HealthKitBridgeMetric.sleepDuration.rawValue,
			unit: HealthKitBridgeMetric.sleepDuration.unit,
			value: rounded(totalHours),
			startAt: iso8601Formatter.string(from: startAt),
			endAt: iso8601Formatter.string(from: endAt),
			metadata: [
				"sampleCount": .number(Double(asleepSamples.count))
			],
			raw: [
				"category": .string("sleep-analysis"),
				"sampleCount": .number(Double(asleepSamples.count))
			]
		)
	}

	private func stepCountRecord(for dayWindow: DayWindow) async throws -> HealthKitBridgeRecord? {
		guard let stepType = HKObjectType.quantityType(forIdentifier: .stepCount) else {
			return nil
		}

		let predicate = HKQuery.predicateForSamples(
			withStart: dayWindow.start,
			end: dayWindow.end,
			options: []
		)
		let descriptor = HKSampleQueryDescriptor(
			predicates: [.quantitySample(type: stepType, predicate: predicate)],
			sortDescriptors: [SortDescriptor(\.endDate, order: .reverse)],
			limit: nil
		)

		let samples = try await descriptor.result(for: healthStore)
		guard !samples.isEmpty else {
			return nil
		}

		let totalSteps = samples.reduce(0.0) { partialResult, sample in
			partialResult + sample.quantity.doubleValue(for: .count())
		}
		let latest = samples.map(\.endDate).max() ?? dayWindow.end

		return HealthKitBridgeRecord(
			id: "steps-\(dayWindow.localDay)",
			recordedAt: iso8601Formatter.string(from: latest),
			metricType: HealthKitBridgeMetric.stepCount.rawValue,
			unit: HealthKitBridgeMetric.stepCount.unit,
			value: rounded(totalSteps),
			startAt: nil,
			endAt: nil,
			metadata: [
				"sampleCount": .number(Double(samples.count))
			],
			raw: [
				"type": .string("HKQuantityTypeIdentifierStepCount"),
				"sampleCount": .number(Double(samples.count))
			]
		)
	}

	private func restingHeartRateRecord(for dayWindow: DayWindow) async throws -> HealthKitBridgeRecord? {
		guard let heartRateType = HKObjectType.quantityType(forIdentifier: .restingHeartRate) else {
			return nil
		}

		let predicate = HKQuery.predicateForSamples(
			withStart: dayWindow.start,
			end: dayWindow.end,
			options: []
		)
		let descriptor = HKSampleQueryDescriptor(
			predicates: [.quantitySample(type: heartRateType, predicate: predicate)],
			sortDescriptors: [SortDescriptor(\.endDate, order: .reverse)],
			limit: 1
		)

		guard let sample = try await descriptor.result(for: healthStore).first else {
			return nil
		}

		return HealthKitBridgeRecord(
			id: "resting-heart-rate-\(dayWindow.localDay)",
			recordedAt: iso8601Formatter.string(from: sample.endDate),
			metricType: HealthKitBridgeMetric.restingHeartRate.rawValue,
			unit: HealthKitBridgeMetric.restingHeartRate.unit,
			value: rounded(sample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: HKUnit.minute()))),
			startAt: nil,
			endAt: nil,
			metadata: nil,
			raw: [
				"type": .string("HKQuantityTypeIdentifierRestingHeartRate")
			]
		)
	}

	private func rounded(_ value: Double) -> Double {
		(value * 10).rounded() / 10
	}

	private func incrementalSleepRecords(for dayWindow: DayWindow) async throws -> (records: [HealthKitBridgeRecord], anchorCommits: [() -> Void]) {
		guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
			return (records: [], anchorCommits: [])
		}

		let predicate = HKQuery.predicateForSamples(withStart: dayWindow.start, end: dayWindow.end, options: [])
		let descriptor = HKAnchoredObjectQueryDescriptor(
			predicates: [.categorySample(type: sleepType, predicate: predicate)],
			anchor: anchorStore.loadAnchor(for: .sleepDuration),
			limit: nil
		)

		let result = try await descriptor.result(for: healthStore)

		let asleepValues: Set<Int> = [
			HKCategoryValueSleepAnalysis.asleepCore.rawValue,
			HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
			HKCategoryValueSleepAnalysis.asleepREM.rawValue,
			HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue
		]

		let records = result.addedSamples
			.filter { asleepValues.contains($0.value) }
			.map { sample in
				HealthKitBridgeRecord(
					id: sample.uuid.uuidString,
					recordedAt: iso8601Formatter.string(from: sample.endDate),
					metricType: HealthKitBridgeMetric.sleepDuration.rawValue,
					unit: HealthKitBridgeMetric.sleepDuration.unit,
					value: rounded(sample.endDate.timeIntervalSince(sample.startDate) / 3600),
					startAt: iso8601Formatter.string(from: sample.startDate),
					endAt: iso8601Formatter.string(from: sample.endDate),
					metadata: nil,
					raw: [
						"type": .string("HKCategoryTypeIdentifierSleepAnalysis")
					]
				)
			}

		return (records: records, anchorCommits: [{ anchorStore.saveAnchor(result.newAnchor, for: .sleepDuration) }])
	}

	private func incrementalQuantityRecords(
		for identifier: HKQuantityTypeIdentifier,
		metric: HealthKitBridgeMetric,
		dayWindow: DayWindow,
		unit: HKUnit
	) async throws -> (records: [HealthKitBridgeRecord], anchorCommits: [() -> Void]) {
		guard let quantityType = HKObjectType.quantityType(forIdentifier: identifier) else {
			return (records: [], anchorCommits: [])
		}

		let predicate = HKQuery.predicateForSamples(withStart: dayWindow.start, end: dayWindow.end, options: [])
		let descriptor = HKAnchoredObjectQueryDescriptor(
			predicates: [.quantitySample(type: quantityType, predicate: predicate)],
			anchor: anchorStore.loadAnchor(for: metric),
			limit: nil
		)

		let result = try await descriptor.result(for: healthStore)

		let records = result.addedSamples.map { sample in
			HealthKitBridgeRecord(
				id: sample.uuid.uuidString,
				recordedAt: iso8601Formatter.string(from: sample.endDate),
				metricType: metric.rawValue,
				unit: metric.unit,
				value: rounded(sample.quantity.doubleValue(for: unit)),
				startAt: iso8601Formatter.string(from: sample.startDate),
				endAt: iso8601Formatter.string(from: sample.endDate),
				metadata: nil,
				raw: [
					"type": .string(identifier.rawValue)
				]
			)
		}

		return (records: records, anchorCommits: [{ anchorStore.saveAnchor(result.newAnchor, for: metric) }])
	}
}

private struct DayWindow {
	let start: Date
	let end: Date
	let localDay: String

	init(day: Date, calendar: Calendar) {
		start = calendar.startOfDay(for: day)
		end = calendar.date(byAdding: .day, value: 1, to: start) ?? day
		let formatter = DateFormatter()
		formatter.calendar = calendar
		formatter.timeZone = calendar.timeZone
		formatter.dateFormat = "yyyy-MM-dd"
		localDay = formatter.string(from: start)
	}
}
