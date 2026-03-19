import Foundation

protocol AuthService {
    func signIn(email: String, password: String) async throws
}

enum AuthServiceError: LocalizedError {
    case invalidCredentials
    case unknown

    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Invalid email or password."
        case .unknown:
            return "Something went wrong. Please try again."
        }
    }
}
