import SwiftUI

struct AuthView: View {
    @StateObject private var viewModel = AuthViewModel()

    var body: some View {
        Form {
            Section("Sign In") {
                TextField("Email", text: $viewModel.email)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)

                SecureField("Password", text: $viewModel.password)

                Button("Sign In") {
                    Task {
                        await viewModel.signIn()
                    }
                }
                .disabled(!viewModel.canSubmit)

                if viewModel.isLoading {
                    ProgressView("Signing in...")
                }

                if let errorMessage = viewModel.errorMessage {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .font(.footnote)
                }

                if viewModel.isAuthenticated {
                    Text("Signed in successfully (mock)")
                        .foregroundColor(.green)
                        .font(.footnote)
                }
            }
        }
        .navigationTitle("Authentication")
    }
}

#Preview {
    NavigationStack {
        AuthView()
    }
}
