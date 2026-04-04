import Foundation
import HealthKit

protocol HealthKitAnchorStoring {
	func loadAnchor(for metric: HealthKitBridgeMetric) -> HKQueryAnchor?
	func saveAnchor(_ anchor: HKQueryAnchor?, for metric: HealthKitBridgeMetric)
	func resetAll()
}

struct HealthKitAnchorStore: HealthKitAnchorStoring {
	private let userDefaults: UserDefaults
	private let keyPrefix: String

	init(
		userDefaults: UserDefaults = .standard,
		keyPrefix: String = "health-cockpit.anchor"
	) {
		self.userDefaults = userDefaults
		self.keyPrefix = keyPrefix
	}

	func loadAnchor(for metric: HealthKitBridgeMetric) -> HKQueryAnchor? {
		guard let data = userDefaults.data(forKey: storageKey(for: metric)) else {
			return nil
		}

		return try? NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: data)
	}

	func saveAnchor(_ anchor: HKQueryAnchor?, for metric: HealthKitBridgeMetric) {
		let key = storageKey(for: metric)

		guard let anchor else {
			userDefaults.removeObject(forKey: key)
			return
		}

		if let data = try? NSKeyedArchiver.archivedData(withRootObject: anchor, requiringSecureCoding: true) {
			userDefaults.set(data, forKey: key)
		}
	}

	func resetAll() {
		for metric in HealthKitBridgeMetric.allCases {
			userDefaults.removeObject(forKey: storageKey(for: metric))
		}
	}

	private func storageKey(for metric: HealthKitBridgeMetric) -> String {
		"\(keyPrefix).\(metric.rawValue)"
	}
}
