import XCTest
@testable import HealthCockpitCompanion

final class BridgeBundleEncodingTests: XCTestCase {
	func testBundleEncodesExpectedContract() throws {
		let bundle = HealthKitBridgeBundle.make(
			deviceId: "iphone-15-pro",
			deviceName: "Pyro iPhone",
			capturedAt: "2026-04-02T13:10:00.000Z",
			timezone: "America/Chicago",
			records: [
				HealthKitBridgeRecord(
					id: "sleep-2026-04-02",
					recordedAt: "2026-04-02T12:30:00.000Z",
					metricType: HealthKitBridgeMetric.sleepDuration.rawValue,
					unit: "hours",
					value: 8,
					startAt: "2026-04-02T04:30:00.000Z",
					endAt: "2026-04-02T12:30:00.000Z",
					metadata: ["sampleCount": .number(3)],
					raw: ["category": .string("sleep-analysis")]
				)
			]
		)

		let writer = HealthKitBundleFileWriter()
		let json = try writer.encodedJSON(for: bundle)

		XCTAssertTrue(json.contains("\"connector\" : \"healthkit-ios\""))
		XCTAssertTrue(json.contains("\"metricType\" : \"sleep-duration\""))
		XCTAssertTrue(json.contains("\"deviceName\" : \"Pyro iPhone\""))
	}


	func testEmptyBundleExportErrorMessageIsExplicit() {
		XCTAssertEqual(HealthKitBundleExportError.emptyBundle.errorDescription, "No matching HealthKit samples were available for this export.")
	}

	func testBundleWriterGeneratesStableFilename() throws {
		let bundle = HealthKitBridgeBundle.make(
			deviceId: "iphone-15-pro",
			deviceName: "Pyro iPhone",
			capturedAt: "2026-04-02T13:10:00.000Z",
			timezone: "America/Chicago",
			records: []
		)

		let outputDirectory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
		try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)
		defer { try? FileManager.default.removeItem(at: outputDirectory) }

		let writer = HealthKitBundleFileWriter(outputDirectory: outputDirectory)
		let url = try writer.write(bundle)

		XCTAssertEqual(url.lastPathComponent, "healthkit-bundle-2026-04-02T13-10-00.000Z.json")
		XCTAssertTrue(FileManager.default.fileExists(atPath: url.path))
	}
}
