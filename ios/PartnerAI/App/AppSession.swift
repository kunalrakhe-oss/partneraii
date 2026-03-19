import Foundation

@MainActor
final class AppSession: ObservableObject {
    @Published var isSignedIn = false

    func markSignedIn() {
        isSignedIn = true
    }

    func signOut() {
        isSignedIn = false
    }
}
