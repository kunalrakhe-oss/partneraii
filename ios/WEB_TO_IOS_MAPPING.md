# PartnerAI Web to iOS Mapping (All Screens)

Date: 2026-03-18  
Source branch: mobile/ios-init  
Purpose: 1:1 implementation map from React pages/routes to SwiftUI screens.

## 1) Route-to-Screen Mapping (Complete)

| Web Route | Web File | iOS Screen File (Suggested) | iOS Navigation | Priority | Notes |
|---|---|---|---|---|---|
| /onboarding | src/pages/OnboardingFlow.tsx | ios/PartnerAI/Features/Onboarding/OnboardingFlowView.swift | Full-screen flow | P0 | First unauthenticated entry. |
| /auth | src/pages/AuthPage.tsx | ios/PartnerAI/Features/Auth/AuthView.swift | Push from onboarding or modal | P0 | Already scaffolded. |
| /reset-password | src/pages/ResetPasswordPage.tsx | ios/PartnerAI/Features/Auth/ResetPasswordView.swift | Push | P0 | Keep token reset parity. |
| /setup | src/pages/PostAuthSetup.tsx | ios/PartnerAI/Features/Setup/PostAuthSetupView.swift | Full-screen gated | P0 | Mandatory initial profile setup. |
| / | src/pages/HomePage.tsx | ios/PartnerAI/Features/Home/HomeView.swift | Tab root | P0 | Main dashboard after auth. |
| /calendar | src/pages/CalendarPage.tsx | ios/PartnerAI/Features/Calendar/CalendarView.swift | Tab | P0 | Large feature; build in slices. |
| /lists | src/pages/GroceryPage.tsx | ios/PartnerAI/Features/Grocery/GroceryListView.swift | Tab | P0 | Shared couple list behavior. |
| /chores | src/pages/ChoresPage.tsx | ios/PartnerAI/Features/Chores/ChoresView.swift | Tab | P0 | Recurrence + assignment. |
| /chat | src/pages/ChatPage.tsx | ios/PartnerAI/Features/Chat/ChatView.swift | Tab | P0 | Realtime messages. |
| /profile | src/pages/ProfilePage.tsx | ios/PartnerAI/Features/Profile/ProfileView.swift | Push from Home/tab | P0 | Account settings + mode. |
| /connect | src/pages/PartnerConnectPage.tsx | ios/PartnerAI/Features/Partner/PartnerConnectView.swift | Push | P1 | Invite and pairing flow. |
| /couple | src/pages/CoupleProfilePage.tsx | ios/PartnerAI/Features/Partner/CoupleProfileView.swift | Push | P1 | Couple-level profile screen. |
| /mood | src/pages/MoodPage.tsx | ios/PartnerAI/Features/Mood/MoodView.swift | Push from Home | P1 | Daily mood + note tracking. |
| /memories | src/pages/MemoriesPage.tsx | ios/PartnerAI/Features/Memories/MemoriesView.swift | Push (feature-gated) | P1 | Media upload + timeline. |
| /workout | src/pages/WorkoutPage.tsx | ios/PartnerAI/Features/Workout/WorkoutView.swift | Push (feature-gated) | P1 | Tracking + progress. |
| /diet | src/pages/DietPage.tsx | ios/PartnerAI/Features/Diet/DietView.swift | Push (feature-gated) | P1 | Meal and goal workflows. |
| /health | src/pages/HealthPage.tsx | ios/PartnerAI/Features/Health/HealthView.swift | Push | P1 | Shared health dashboard. |
| /budget | src/pages/BudgetPage.tsx | ios/PartnerAI/Features/Budget/BudgetView.swift | Push | P1 | Shared expense tracking. |
| /event-planner | src/pages/EventPlannerPage.tsx | ios/PartnerAI/Features/EventPlanner/EventPlannerView.swift | Push | P1 | Event planning helper. |
| /baby-plan | src/pages/BabyPlanPage.tsx | ios/PartnerAI/Features/Baby/BabyPlanView.swift | Push | P2 | Specialized feature set. |
| /mens-health | src/pages/MensHealthPage.tsx | ios/PartnerAI/Features/MensHealth/MensHealthView.swift | Push | P2 | Specialized feature set. |
| /physio | src/pages/PhysioPage.tsx | ios/PartnerAI/Features/Physio/PhysioView.swift | Push | P2 | Recovery routines/tracking. |
| /postpartum | src/pages/PostpartumPage.tsx | ios/PartnerAI/Features/Postpartum/PostpartumView.swift | Push | P2 | Recovery support features. |
| /safety | src/pages/SafetyCheckInPage.tsx | ios/PartnerAI/Features/Safety/SafetyCheckInView.swift | Push | P2 | Check-in workflows. |
| /upgrade | src/pages/UpgradePage.tsx | ios/PartnerAI/Features/Subscription/UpgradeView.swift | Push/Sheet | P2 | Subscription upsell. |
| * (not found) | src/pages/NotFound.tsx | ios/PartnerAI/Features/Common/NotFoundView.swift | Fallback state | P3 | Keep for deep-link failures. |
| /welcome (legacy) | src/pages/WelcomePage.tsx | ios/PartnerAI/Features/Onboarding/WelcomeView.swift | Optional | P3 | Use only if still linked. |
| /index (legacy) | src/pages/Index.tsx | ios/PartnerAI/Features/Common/IndexView.swift | Optional | P3 | Validate if still in use. |

## 2) App Shell Mapping

| Web App Layer | Current Web Implementation | iOS Equivalent |
|---|---|---|
| Global app entry | src/App.tsx | ios/PartnerAI/App/PartnerAIApp.swift |
| Root layout + tabs | src/components/AppLayout.tsx | ios/PartnerAI/App/RootTabView.swift |
| Auth gate + setup gate | AppRoutes in src/App.tsx | ios/PartnerAI/App/AppRouter.swift |
| Global contexts | src/contexts/* | ObservableObject stores (SessionStore, ThemeStore, LanguageStore, SubscriptionStore) |
| Feature gate | src/components/FeatureGate.tsx | Gate wrapper view/modifier with subscription state |

## 3) Primary Tab Strategy (Match Existing UX)

From web layout tabs, implement these first in iOS TabView:
- Home
- Calendar
- Lists (Grocery)
- Chat
- Chores

Suggested file:
- ios/PartnerAI/App/RootTabView.swift

## 4) Data/Backend Reuse Mapping

| Domain | Web Source Pattern | iOS Data Layer |
|---|---|---|
| Auth | Supabase auth in contexts/services | AuthService + SupabaseAuthService |
| Profiles | profiles table queries | ProfileRepository + ProfileModel |
| Partner pairing | partner_invites + profiles.partner_id | PartnerRepository |
| Calendar events | calendar/event queries in pages | CalendarRepository |
| Grocery | grocery_items table | GroceryRepository |
| Chores | chores table + recurrence logic | ChoresRepository |
| Mood | mood logs + partner mood | MoodRepository |
| Chat | realtime messages | ChatRepository + realtime subscription manager |
| Memories | memories + storage objects | MemoriesRepository + media upload service |
| Subscription | feature gating in web | SubscriptionRepository + local gate service |

## 5) UI System Translation (Web -> SwiftUI)

| Web UI Pattern | iOS Equivalent |
|---|---|
| Tailwind utility composition | Custom ViewModifiers + design tokens |
| shadcn Card/Button/Input | SwiftUI custom components (PAICard/PAIButton/PAITextField) |
| Radix dialogs/sheets | .sheet, .confirmationDialog, .alert |
| Framer motion transitions | withAnimation + matchedGeometryEffect |
| Toasts/sonner | Banner/toast manager (overlay) |

## 6) Implementation Order (All Screens, staged)

Phase A (Foundation):
- AuthView, ResetPasswordView, PostAuthSetupView, HomeView, RootTabView

Phase B (Core tabs):
- CalendarView, GroceryListView, ChoresView, ChatView

Phase C (Core supporting):
- ProfileView, PartnerConnectView, CoupleProfileView, MoodView

Phase D (Premium and advanced):
- MemoriesView, WorkoutView, DietView, HealthView, BudgetView, EventPlannerView, UpgradeView

Phase E (Specialized):
- BabyPlanView, MensHealthView, PhysioView, PostpartumView, SafetyCheckInView

Phase F (fallback/cleanup):
- NotFoundView, legacy Welcome/Index handling

## 7) Parity Checklist Per Screen

Use this for every mapped screen:
- Route parity and navigation parity
- Data load parity (including empty/loading/error states)
- Mutation parity (create/update/delete)
- Access-control parity (auth + feature gate)
- Realtime parity where relevant
- Visual parity with iOS-native conventions

## 8) What You Get from This Map

- Complete coverage for all web pages.
- Exact iOS file naming targets to avoid ad-hoc structure drift.
- Prioritized build order so you can ship iteratively.
- Clear handoff between current web logic and iOS implementation.
