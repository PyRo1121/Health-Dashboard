import Foundation

enum HealthKitExportMode: String, CaseIterable, Identifiable {
	case dailySnapshot
	case incrementalChanges

	var id: String { rawValue }

	var title: String {
		switch self {
		case .dailySnapshot:
			return "Daily snapshot"
		case .incrementalChanges:
			return "Changes since last export"
		}
	}

	var summary: String {
		switch self {
		case .dailySnapshot:
			return "Exports one compact daily bundle with sleep duration, total steps, and the latest resting heart rate."
		case .incrementalChanges:
			return "Uses anchored HealthKit queries to export only new matching samples since the last successful export."
		}
	}
}
