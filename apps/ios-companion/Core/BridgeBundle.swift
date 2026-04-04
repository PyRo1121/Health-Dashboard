import Foundation

enum HealthKitBridgeMetric: String, CaseIterable, Codable, Identifiable {
	case sleepDuration = "sleep-duration"
	case stepCount = "step-count"
	case restingHeartRate = "resting-heart-rate"

	var id: String { rawValue }

	var unit: String {
		switch self {
		case .sleepDuration:
			return "hours"
		case .stepCount:
			return "count"
		case .restingHeartRate:
			return "bpm"
		}
	}
}

enum JSONValue: Codable, Equatable {
	case string(String)
	case number(Double)
	case bool(Bool)
	case array([JSONValue])
	case object([String: JSONValue])
	case null

	init(from decoder: Decoder) throws {
		let container = try decoder.singleValueContainer()

		if container.decodeNil() {
			self = .null
		} else if let string = try? container.decode(String.self) {
			self = .string(string)
		} else if let number = try? container.decode(Double.self) {
			self = .number(number)
		} else if let bool = try? container.decode(Bool.self) {
			self = .bool(bool)
		} else if let array = try? container.decode([JSONValue].self) {
			self = .array(array)
		} else {
			self = .object(try container.decode([String: JSONValue].self))
		}
	}

	func encode(to encoder: Encoder) throws {
		var container = encoder.singleValueContainer()

		switch self {
		case .string(let value):
			try container.encode(value)
		case .number(let value):
			try container.encode(value)
		case .bool(let value):
			try container.encode(value)
		case .array(let value):
			try container.encode(value)
		case .object(let value):
			try container.encode(value)
		case .null:
			try container.encodeNil()
		}
	}
}

struct HealthKitBridgeRecord: Codable, Equatable, Identifiable {
	let id: String
	let recordedAt: String
	let metricType: String
	let unit: String
	let value: Double
	let startAt: String?
	let endAt: String?
	let metadata: [String: JSONValue]?
	let raw: [String: JSONValue]
}

struct HealthKitBridgeBundle: Codable, Equatable {
	let connector: String
	let connectorVersion: Int
	let deviceId: String
	let deviceName: String
	let sourcePlatform: String
	let capturedAt: String
	let timezone: String
	let records: [HealthKitBridgeRecord]

	static func make(
		deviceId: String,
		deviceName: String,
		capturedAt: String,
		timezone: String,
		records: [HealthKitBridgeRecord]
	) -> HealthKitBridgeBundle {
		HealthKitBridgeBundle(
			connector: "healthkit-ios",
			connectorVersion: 1,
			deviceId: deviceId,
			deviceName: deviceName,
			sourcePlatform: "ios",
			capturedAt: capturedAt,
			timezone: timezone,
			records: records
		)
	}
}
