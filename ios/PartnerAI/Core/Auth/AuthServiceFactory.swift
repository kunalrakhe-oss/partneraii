import Foundation

enum AuthServiceFactory {
    static func makeAuthService() -> AuthService {
        // Use Supabase only when config is present; otherwise fallback to mock.
        if SupabaseConfig.isConfigured {
            return SupabaseAuthService(url: SupabaseConfig.url, anonKey: SupabaseConfig.anonKey)
        }

        return MockAuthService()
    }
}
