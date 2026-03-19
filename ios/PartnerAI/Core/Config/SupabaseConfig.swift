import Foundation

enum SupabaseConfig {
    // TODO: Move these values to a secure config source before production.
    static let url = ""
    static let anonKey = ""

    static var isConfigured: Bool {
        !url.isEmpty && !anonKey.isEmpty
    }
}
