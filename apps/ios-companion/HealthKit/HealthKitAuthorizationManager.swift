import Foundation
import HealthKit

protocol HealthKitAuthorizationManaging {
	func requestReadAuthorization() async throws
}

struct HealthKitAuthorizationManager: HealthKitAuthorizationManaging {
	private let healthStore: HKHealthStore

	init(healthStore: HKHealthStore = HKHealthStore()) {
		self.healthStore = healthStore
	}

	func requestReadAuthorization() async throws {
		guard HKHealthStore.isHealthDataAvailable() else {
			throw NSError(domain: "HealthCockpitCompanion", code: 1, userInfo: [
				NSLocalizedDescriptionKey: "Health data is not available on this device."
			])
		}

		let readTypes: Set<HKObjectType> = [
			HKObjectType.categoryType(forIdentifier: .sleepAnalysis),
			HKObjectType.quantityType(forIdentifier: .stepCount),
			HKObjectType.quantityType(forIdentifier: .restingHeartRate)
		].compactMap { $0 }

		try await withCheckedThrowingContinuation { continuation in
			healthStore.requestAuthorization(toShare: nil, read: readTypes) { success, error in
				if let error {
					continuation.resume(throwing: error)
				} else if success {
					continuation.resume(returning: ())
				} else {
					continuation.resume(throwing: NSError(
						domain: "HealthCockpitCompanion",
						code: 2,
						userInfo: [NSLocalizedDescriptionKey: "HealthKit authorization was not granted."]
					))
				}
			}
		}
	}
}
