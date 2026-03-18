

# Polish App for Single Users — Single vs Couple Mode

## Problem
The entire app is designed around couples — the onboarding assumes a partner, the homepage shows "partner mood," "days together," "partnership stats," and couple avatars. Single users have no clear entry path and see irrelevant couple-centric content everywhere.

## Solution
Add a **Single / Couple** mode choice early in onboarding. Store the user's mode in the `profiles` table. Then conditionally show/hide couple-specific features throughout the app based on this mode.

## Database Changes

### Add `app_mode` column to `profiles`
```sql
ALTER TABLE public.profiles ADD COLUMN app_mode TEXT NOT NULL DEFAULT 'couple';
-- Values: 'single' or 'couple'
```

No new tables needed. The existing solo partner_pair mechanism (`solo:user_id`) continues to work for data isolation.

## Onboarding Changes (`OnboardingFlow.tsx`)

### New step after slides: "mode-select" (replaces current "mode" step)
Instead of just "With My Partner" button, show two clear options:

1. **"Just Me"** — Sets `app_mode = 'single'`, skips relationship details and partner connect steps, goes straight to `setup-names` (without partner name field) then `setup-start`
2. **"With My Partner"** — Existing couple flow (relationship details, invite code, connect)

### Step flow for singles:
```
language → entry → slides → mode-select → setup-names (solo) → setup-start → home
```

### Step flow for couples (unchanged):
```
language → entry → slides → mode-select → setup-names → setup-relationship → setup-connect → setup-start → home
```

### Update slides content
Make slides 1-3 more inclusive — currently they say "partner," "relationship." Change to be applicable to both:
- Slide 1: "Stay on top of your day" (instead of "Stay connected daily")
- Slide 2: "Smart AI for your life" (instead of "for your relationship")  
- Slide 3: "Build your best life" (instead of "Build something together")

## WelcomePage Changes
Update headline from "Your life together, organized" to "Your life, organized." Update buttons: "Get Started" (primary) instead of "Create Our Space". Remove "Join My Partner" or make it secondary. Update social proof text.

## HomePage Changes (`HomePage.tsx`)

### Conditional rendering based on `app_mode`:
- **Hide for singles**: Partner mood widget, couple avatars, "Connect Partner" CTA, mood reaction popup, "days together" stat (replace with "day streak" or similar)
- **Show for singles**: Personal mood check, calendar, chores, grocery, all health/fitness/diet features, AI insight
- **Rename for singles**: "Partnership Stats" → "My Stats", partner-specific labels adapted

### Add `app_mode` to profile fetch
Fetch `app_mode` alongside `display_name` in the initial profile load. Store in state and use for conditional rendering.

## Profile Page Changes
- For singles: Hide "Partner Profile" and "Remove Partner" options
- Show "Switch to Couple Mode" option that lets them upgrade later (navigates to partner connect)

## AppLayout / Navigation
No changes needed — all nav tabs work for both modes.

## Other Pages
- **PartnerConnectPage**: Accessible from profile if single user wants to switch to couple mode
- **CoupleProfilePage**: Redirect singles to their own profile page
- **ChatPage**: For singles, this becomes a self-journal or AI chat only (hide partner messaging features)
- **MoodPage**: Works for both — just hide partner mood comparison for singles

## Translation Updates
Add new keys for single-mode variants of couple-specific strings.

## Files to Edit
- **Migration**: Add `app_mode` column to profiles
- `src/pages/OnboardingFlow.tsx` — Add mode-select step, branch flows for single/couple
- `src/pages/WelcomePage.tsx` — Make inclusive language
- `src/pages/HomePage.tsx` — Conditional widgets based on app_mode
- `src/pages/ProfilePage.tsx` — Hide couple-specific settings for singles, add "Switch to Couple" option
- `src/pages/CoupleProfilePage.tsx` — Redirect singles
- `src/lib/translations/en.ts` — Add single-mode string variants
- `src/lib/translations/hi.ts` — Same for Hindi

