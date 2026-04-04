import Foundation

protocol HealthKitBundleFileWriting {
	func encodedJSON(for bundle: HealthKitBridgeBundle) throws -> String
	func write(_ bundle: HealthKitBridgeBundle) throws -> URL
}

struct HealthKitBundleFileWriter: HealthKitBundleFileWriting {
	private let encoder: JSONEncoder
	private let fileManager: FileManager
	private let outputDirectory: URL

	init(
		fileManager: FileManager = .default,
		outputDirectory: URL = FileManager.default.temporaryDirectory
	) {
		let encoder = JSONEncoder()
		encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
		self.encoder = encoder
		self.fileManager = fileManager
		self.outputDirectory = outputDirectory
	}

	func encodedJSON(for bundle: HealthKitBridgeBundle) throws -> String {
		let data = try encoder.encode(bundle)
		guard let json = String(data: data, encoding: .utf8) else {
			throw CocoaError(.fileWriteInapplicableStringEncoding)
		}

		return json
	}

	func write(_ bundle: HealthKitBridgeBundle) throws -> URL {
		let filename = "healthkit-bundle-\(bundle.capturedAt.replacingOccurrences(of: ":", with: "-")).json"
		let url = outputDirectory.appendingPathComponent(filename)
		let data = try encoder.encode(bundle)

		if fileManager.fileExists(atPath: url.path) {
			try fileManager.removeItem(at: url)
		}

		try data.write(to: url, options: .atomic)
		return url
	}
}
