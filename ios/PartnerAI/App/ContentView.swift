import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var session: AppSession

    var body: some View {
        Group {
            if session.isSignedIn {
                AuthenticatedHomeView()
            } else {
                NavigationStack {
                    VStack(spacing: 16) {
                        Text("PartnerAI iOS")
                            .font(.largeTitle)
                            .fontWeight(.semibold)

                        Text("Sign in to continue. App switches to Home after successful auth.")
                            .font(.body)
                            .multilineTextAlignment(.center)
                            .foregroundColor(.secondary)
                            .padding(.horizontal)

                        NavigationLink("Open Auth") {
                            AuthView {
                                session.markSignedIn()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                    .navigationTitle("Welcome")
                }
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AppSession())
}
