import SwiftUI

@main
struct HealthCockpitCompanionApp: App {
	@StateObject private var viewModel = CompanionViewModel()

	var body: some Scene {
		WindowGroup {
			ContentView(viewModel: viewModel)
		}
	}
}
