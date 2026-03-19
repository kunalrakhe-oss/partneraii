PartnerAI iOS scaffold

This folder contains the initial SwiftUI scaffold for native iOS development.

Current status:
- App entry point created
- App session routing (Auth -> Home -> Sign Out) created
- Auth screen + ViewModel + mock service created
- Supabase auth service + factory fallback created

Next steps:
1. Create an Xcode project at ios/PartnerAI.xcodeproj and include files in ios/PartnerAI/.
2. Add Supabase Swift dependency using Swift Package Manager.
3. Fill SupabaseConfig url + anonKey values.
4. Replace placeholder SupabaseConfig values with secure runtime config.

Auth mode behavior:
- If SupabaseConfig is configured, AuthViewModel uses SupabaseAuthService.
- If not configured, AuthViewModel automatically falls back to MockAuthService.
- This keeps the iOS app safe while wiring real backend dependencies.

How to run on Mac (Xcode):
1. Open Xcode and create an iOS App project named PartnerAI.
2. Save it as ios/PartnerAI.xcodeproj in this repository.
3. Drag folders from ios/PartnerAI/ into Xcode project navigator.
4. In Target settings, set Bundle Identifier (example: com.partneraii.ios).
5. Add your Apple Team in Signing & Capabilities.
6. Build and run on iPhone using a cable first run.

How to inspect current repository state:
- git status --short
- git branch --show-current
- git rev-parse --short HEAD
- git log -1 --oneline
- git diff --name-only

Current mock login for testing UI flow:
- Email: test@partnerai.app
- Password: password123
- Successful sign-in routes to AuthenticatedHomeView

Why macOS is needed:
- Build: Required. iOS compilation uses Xcode and Apple toolchains only available on macOS.
- Testing on iPhone: Required. Device deployment/signing uses Xcode + Apple Developer certificates.
- Simulator testing: Required. iOS Simulator runs only on macOS.
- Coding only: Not required. You can edit Swift files on Windows, but cannot build/run there.
