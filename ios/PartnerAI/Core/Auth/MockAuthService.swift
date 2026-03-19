import Foundation

final class MockAuthService: AuthService {
    func signIn(email: String, password: String) async throws {
        try await Task.sleep(nanoseconds: 700_000_000)

        // Temporary mock behavior until Supabase auth is wired.
        if email.lowercased() == "test@partnerai.app" && password == "password123" {
            return
        }

        throw AuthServiceError.invalidCredentials
    }
}
