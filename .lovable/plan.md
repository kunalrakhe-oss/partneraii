

# Fix: Apply Auth Page Mode Selection + Smaller Capsule Toggle

## Problem
1. Selecting "Me Mode" on the auth page stores the value in `localStorage`, but after Google sign-in the app reads `app_mode` from the database (which defaults to `"couple"`). The localStorage selection is never synced to the DB.
2. Google sign-in often has a `display_name` from metadata, so `PostAuthSetup` is skipped entirely — the mode never gets written.
3. The mode toggle on the auth page is full-width; user wants a smaller capsule style.

## Changes

### 1. `src/App.tsx` — Sync localStorage mode to DB after auth
In the profile check `useEffect` (lines 61-86), after confirming the user is authenticated:
- Read `localStorage.getItem("lovelist-app-mode")`
- If a value exists (`"single"` or `"couple"`), update the profile's `app_mode` in the database
- Clear the localStorage key after syncing so it only applies once

This ensures the auth page selection is always applied, whether or not PostAuthSetup is shown.

### 2. `src/pages/AuthPage.tsx` — Smaller capsule toggle
Restyle the Me/We toggle (lines 92-101):
- Reduce width to `w-fit mx-auto` instead of `w-full`
- Use smaller padding (`px-4 py-1.5`), smaller rounded corners (`rounded-full` for capsule shape)
- Reduce icon size to 12px and text to `text-[11px]`
- Keep the same highlight/active styling but in a compact capsule form

### Files
- `src/App.tsx` — Add mode sync logic in the profile check effect
- `src/pages/AuthPage.tsx` — Restyle toggle to compact capsule

