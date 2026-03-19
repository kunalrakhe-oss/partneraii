import Foundation

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var isAuthenticated = false

    private let authService: AuthService

    init(authService: AuthService = AuthServiceFactory.makeAuthService()) {
        self.authService = authService
    }

    var canSubmit: Bool {
        !email.isEmpty && !password.isEmpty && !isLoading
    }

    func signIn() async {
        guard canSubmit else { return }

        isLoading = true
        errorMessage = nil

        do {
            try await authService.signIn(email: email, password: password)
            isAuthenticated = true
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Unable to sign in."
            isAuthenticated = false
        }

        isLoading = false
    }
}
