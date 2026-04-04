import SwiftUI

struct ContentView: View {
	@ObservedObject var viewModel: CompanionViewModel

	var body: some View {
		NavigationStack {
			ScrollView {
				VStack(alignment: .leading, spacing: 20) {
					headerCard
					authorizationCard
					exportCard
					previewCard
				}
				.padding(20)
			}
			.navigationTitle("Health Companion")
		}
	}

	private var headerCard: some View {
		VStack(alignment: .leading, spacing: 10) {
			Text("iPhone-first T9 proof of concept")
				.font(.title2.weight(.semibold))

			Text("Reads sleep duration, step count, and resting heart rate from HealthKit, then exports a local JSON bundle for the web app import center.")
				.foregroundStyle(.secondary)
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding()
		.background(.thinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
	}

	private var authorizationCard: some View {
		VStack(alignment: .leading, spacing: 12) {
			Text("Health access")
				.font(.headline)

			Text(authorizationLabel)
				.foregroundStyle(.secondary)

			Button("Request Health Access") {
				Task {
					await viewModel.requestAuthorization()
				}
			}
			.buttonStyle(.borderedProminent)
			.disabled(viewModel.authorizationState == .requesting)
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding()
		.background(.thinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
	}

	private var exportCard: some View {
		VStack(alignment: .leading, spacing: 12) {
			Text("Export bundle")
				.font(.headline)

			Picker("Export mode", selection: $viewModel.exportMode) {
				ForEach(HealthKitExportMode.allCases) { mode in
					Text(mode.title).tag(mode)
				}
			}
			.pickerStyle(.segmented)

			Text(viewModel.exportMode.summary)
				.foregroundStyle(.secondary)

			Text(viewModel.lastSummary)
				.foregroundStyle(.secondary)

			Button("Export Today Bundle") {
				Task {
					await viewModel.exportTodayBundle()
				}
			}
			.buttonStyle(.borderedProminent)
			.disabled(viewModel.authorizationState != .authorized || viewModel.exportState == .exporting)

			if let exportURL = viewModel.exportURL {
				ShareLink("Share JSON Bundle", item: exportURL)
			}

			if case .failed(let message) = viewModel.exportState {
				Text(message)
					.foregroundStyle(.red)
			}
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding()
		.background(.thinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
	}

	private var previewCard: some View {
		VStack(alignment: .leading, spacing: 12) {
			Text("Bundle preview")
				.font(.headline)

			if viewModel.previewJSON.isEmpty {
				Text("Export a bundle to preview the exact payload before sharing it into the web app.")
					.foregroundStyle(.secondary)
			} else {
				ScrollView(.horizontal) {
					Text(viewModel.previewJSON)
						.font(.system(.footnote, design: .monospaced))
						.textSelection(.enabled)
				}
			}
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding()
		.background(.thinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
	}

	private var authorizationLabel: String {
		switch viewModel.authorizationState {
		case .idle:
			return "Health access has not been requested yet."
		case .requesting:
			return "Requesting read access for sleep, steps, and resting heart rate."
		case .authorized:
			return "HealthKit access granted. You can export a bundle now."
		case .failed(let message):
			return message
		}
	}
}

#Preview {
	ContentView(viewModel: CompanionViewModel())
}
