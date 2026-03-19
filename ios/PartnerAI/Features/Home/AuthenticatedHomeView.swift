import SwiftUI

struct AuthenticatedHomeView: View {
    @EnvironmentObject private var session: AppSession

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Text("PartnerAI")
                    .font(.largeTitle)
                    .fontWeight(.semibold)

                Text("You are signed in. Next: wire dashboard widgets and tabs.")
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                Button("Sign Out") {
                    session.signOut()
                }
                .buttonStyle(.bordered)
            }
            .padding()
            .navigationTitle("Home")
        }
    }
}

#Preview {
    AuthenticatedHomeView()
        .environmentObject(AppSession())
}
