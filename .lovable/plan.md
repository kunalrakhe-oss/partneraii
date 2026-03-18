

# Fix: Always Show Onboarding Before Auth + Mode Selection Flow

## Problems Identified

1. **Onboarding never shows after first use**: `lovelist-onboarding-done` is set permanently and never cleared on sign-out. So after logout, users go straight to `/auth` — no onboarding slides, no mode selection.

2. **PostAuthSetup never triggers for existing users**: The `handle_new_user` trigger auto-creates a profile row on signup, so `checkProfile` in `App.tsx` always finds a row and marks `needsSetup = false`. The PostAuthSetup page is effectively unreachable.

3. **Mode selection before auth has no effect for returning users**: Onboarding's mode step stores `lovelist-app-mode` in localStorage, but nothing reads it after auth to apply the chosen mode.

## Solution

### 1. Clear onboarding flag on sign-out (`ProfilePage.tsx` + `ProfileDrawer.tsx`)
Add `localStorage.removeItem("lovelist-onboarding-done")` to sign-out handlers so users always see onboarding flow before auth.

### 2. Rework the unauthenticated flow (`App.tsx`)
- **Always** show onboarding for unauthenticated users (remove the `onboardingDone` check that skips to `/auth`)
- Keep `/auth` as a valid route for unauthenticated users (the onboarding mode step navigates there)
- The flow becomes: Onboarding (language → slides → mode selection) → Auth page → Home

### 3. Fix PostAuthSetup logic (`App.tsx`)
- Don't mark setup as done just because a profile row exists — the trigger creates one automatically
- Instead, check if the user has explicitly completed setup by adding a `setup_completed` flag or by checking `lovelist-setup-done` more carefully
- For the "session only" mode behavior: read `lovelist-app-mode` from localStorage after auth but don't overwrite the saved mode. Just use it to inform the UI during that session.

### 4. Remove auto-set of `lovelist-onboarding-done` on auth (`App.tsx`)
Currently line 59-61 auto-sets `lovelist-onboarding-done` when a user authenticates. Remove this — let the onboarding flow itself set it when completed properly.

## Files to Edit

### `src/App.tsx`
- Remove the auto-setting of `lovelist-onboarding-done` on auth (lines 59-61)
- Change default route for unauthenticated users: always `/onboarding` (remove the `onboardingDone` ternary, keep `/auth` route available)
- Fix `needsSetup` logic: check for a dedicated `setup_completed` column or use a smarter heuristic (e.g., profile exists but `app_mode` is still the default `'couple'` AND no `lovelist-setup-done` flag)

### `src/pages/ProfilePage.tsx`
- In `handleSignOut`: also clear `lovelist-onboarding-done`

### `src/components/ProfileDrawer.tsx`
- In sign-out handler: also clear `lovelist-onboarding-done` and `lovelist-setup-done`

### `src/pages/OnboardingFlow.tsx`
- In `handleModeSelect` for unauthenticated users: store chosen mode in localStorage and navigate to `/auth` (already does this — no change needed)
- The mode selection step already exists and works; it just wasn't reachable due to the routing bug

## Flow After Fix

```text
User signs out
  → localStorage: lovelist-onboarding-done removed
  → localStorage: lovelist-setup-done removed

User opens app (unauthenticated)
  → Always routes to /onboarding
  → Language → Slides → Mode Selection (Me/We)
  → Navigate to /auth with mode stored in localStorage

User signs in
  → If lovelist-setup-done not set → show PostAuthSetup (name entry)
  → PostAuthSetup reads lovelist-app-mode from localStorage (session only, doesn't overwrite saved mode)
  → Completes setup → Home
```

