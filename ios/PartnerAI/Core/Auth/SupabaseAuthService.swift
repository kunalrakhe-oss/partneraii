import Foundation

#if canImport(Supabase)
import Supabase

final class SupabaseAuthService: AuthService {
    private let client: SupabaseClient

    init(url: String, anonKey: String) {
        self.client = SupabaseClient(supabaseURL: URL(string: url)!, supabaseKey: anonKey)
    }

    func signIn(email: String, password: String) async throws {
        do {
            _ = try await client.auth.signIn(email: email, password: password)
        } catch {
            throw AuthServiceError.invalidCredentials
        }
    }
}

#else

final class SupabaseAuthService: AuthService {
    init(url: String, anonKey: String) {
        _ = (url, anonKey)
    }

    func signIn(email: String, password: String) async throws {
        _ = (email, password)
        throw AuthServiceError.unknown
    }
}

#endif
