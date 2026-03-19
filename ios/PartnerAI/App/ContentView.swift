import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Text("PartnerAI iOS")
                    .font(.largeTitle)
                    .fontWeight(.semibold)

                Text("iOS scaffold is ready. Next step: wire authentication.")
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.secondary)
                    .padding(.horizontal)

                NavigationLink("Open Auth") {
                    AuthView()
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .navigationTitle("Home")
        }
    }
}

#Preview {
    ContentView()
}
