

# Plan: Move Login After Onboarding Data Collection

## Current flow
1. **Onboarding** (unauthenticated): Language → Slides → Mode → redirects to `/auth`
2. **Auth**: Email magic link login
3. **PostAuthSetup** (authenticated): Language → Mode → Name → Priorities → Life Goals → Daily Habits → AI Profile → Confirm

Problem: User hits a login wall before giving any preferences. The selection screens in PostAuthSetup duplicate some onboarding steps.

## New flow

```text
Onboarding (no login required):
  Language → Entry → Slides → Mode → Name → Priorities → Life Goals → Daily Habits
  → "Save your progress!" login prompt (email magic link inline)

After auth:
  → Auto-save all cached data to DB → Generate AI profile → Home
```

## Changes

### 1. `src/pages/OnboardingFlow.tsx` — Add selection steps + inline login

- Add 4 new steps after `mode`: `name`, `priorities`, `life-goals`, `daily-habits`, then `save-progress` (login prompt)
- Reuse the same `ChipSelector` component and option arrays from PostAuthSetup
- Store all selections in localStorage as JSON (`lovelist-onboard-data`: `{ name, priorities, lifeGoals, dailyHabits }`)
- The `save-progress` step shows: "Want to save your progress? Sign in with a quick email link" with the email input + send magic link button (same logic as AuthPage)
- After mode selection, instead of redirecting to `/auth`, proceed to `name` step
- Remove the old `setup-names`, `setup-relationship`, `setup-connect`, `setup-start` steps (these will move to post-auth or be handled differently)

### 2. `src/pages/PostAuthSetup.tsx` — Simplify to data-saving + AI profile generation

- On mount, read `lovelist-onboard-data` from localStorage
- If data exists: auto-save name/mode to `profiles`, call AI to generate profile, save to `user_preferences`, clear localStorage, navigate to home (or `/connect` for couple mode)
- If no cached data: fall back to existing selection flow (for users who somehow skip onboarding)
- Remove the language/mode steps (already done in onboarding)

### 3. `src/pages/AuthPage.tsx` — Keep as fallback route

- Still accessible at `/auth` for direct navigation
- No changes needed

### 4. `src/App.tsx` — Minor routing adjustment

- Unauthenticated users can access `/onboarding` (already works)
- After auth, the `needsSetup` check still routes to `/setup` which now auto-processes cached data

### UX of the login prompt step

The "save-progress" step will show:
- Headline: "Save your progress"
- Subtext: "Sign in with a quick email link to keep your personalized plan"
- Email input + "Send Sign-In Link" button (reuses AuthPage magic link logic)
- After sending: "Check your inbox" confirmation with resend option
- Small "Skip for now" link that enters demo mode

### Data flow

- All selections cached in `localStorage` under `lovelist-onboard-data`
- After successful auth → redirect to `/setup` → PostAuthSetup reads cache → saves to DB → generates AI profile → navigates to home
- Cache is cleared after successful save

