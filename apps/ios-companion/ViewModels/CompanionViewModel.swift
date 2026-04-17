import Combine
import Foundation

@MainActor
final class CompanionViewModel: ObservableObject {
	enum AuthorizationState: Equatable {
		case idle
		case requesting
		case authorized
		case failed(String)
	}

	enum ExportState: Equatable {
		case idle
		case exporting
		case ready
		case failed(String)
	}

	@Published private(set) var authorizationState: AuthorizationState = .idle
	@Published private(set) var exportState: ExportState = .idle
	@Published private(set) var exportURL: URL?
	@Published private(set) var previewJSON: String = ""
	@Published private(set) var lastSummary: String = "No bundle exported yet."
	@Published var exportMode: HealthKitExportMode = .dailySnapshot

	private let authorizationManager: HealthKitAuthorizationManaging
	private let exporter: HealthKitBundleExporting
	private let writer: HealthKitBundleFileWriting

	init(
		authorizationManager: HealthKitAuthorizationManaging = HealthKitAuthorizationManager(),
		exporter: HealthKitBundleExporting = HealthKitBundleExporter(),
		writer: HealthKitBundleFileWriting = HealthKitBundleFileWriter()
	) {
		self.authorizationManager = authorizationManager
		self.exporter = exporter
		self.writer = writer
	}

	func requestAuthorization() async {
		authorizationState = .requesting

		do {
			try await authorizationManager.requestReadAuthorization()
			authorizationState = .authorized
		} catch {
			authorizationState = .failed(error.localizedDescription)
		}
	}

	func exportTodayBundle() async {
		exportState = .exporting

		do {
			let exportResult = try await exporter.exportBundle(for: .now, mode: exportMode)
			exportURL = try writer.write(exportResult.bundle)
			exportResult.commitAnchors()
			previewJSON = try writer.encodedJSON(for: exportResult.bundle)
			lastSummary = "Exported \(exportResult.bundle.records.count) records from \(exportResult.bundle.deviceName) using \(exportMode.title.lowercased())."
			exportState = .ready
		} catch {
			exportState = .failed(error.localizedDescription)
		}
	}
}
