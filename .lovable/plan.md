

# Fix Onboarding Flow After Logout + Add Me/We Mode Toggle

## Issue 1: Onboarding doesn't show mode selection after logout

**Root cause**: In `App.tsx`, the routing logic checks `localStorage.getItem("lovelist-onboarding-done")`. Once set to `"true"` during first use, subsequent logouts always route to `/auth` — skipping onboarding entirely. New Google sign-in users also skip mode selection because `AuthPage` doesn't include a mode-select step.

**Fix**: After signup/login via `AuthPage`, check if the user's profile has `app_mode` set. If they've never chosen a mode (new user), redirect them to a post-auth mode selection step. This is simpler and more reliable than resetting localStorage.

### Changes to `AuthPage.tsx`:
- No changes needed here — the redirect after auth is handled by `App.tsx`

### Changes to `App.tsx`:
- After authentication, check if the user needs onboarding (no profile or no explicit mode chosen)
- Add a route for `/setup` that shows the mode selection + name setup for new users
- Redirect new authenticated users to `/setup` instead of `/`

### New component: `PostAuthSetup.tsx`
A simple page shown to newly authenticated users who haven't completed setup:
1. Mode selection (Me Mode / We Mode) — saves `app_mode` to profile
2. Name entry — saves `display_name` to profile
3. For couple mode: option to go to partner connect or skip
4. Marks setup as complete and navigates to home

## Issue 2: Add Me/We mode toggle in Profile settings

### Changes to `ProfilePage.tsx`:
- For **couple** users (without a connected partner): Show "Switch to Me Mode" option that sets `app_mode = 'single'`
- For **couple** users (with a connected partner): Show "Remove Partner" which already switches to single mode
- For **single** users: Already has "Switch to Couple Mode" — keep as is
- Add a new dedicated **"App Mode"** setting row that shows current mode and allows toggling between Me/We mode directly via a tap (opening a small bottom sheet or directly toggling)

### Implementation detail for mode toggle:
Add a new setting item visible to all users:
```
{ key: "app-mode", icon: Users, label: "App Mode", sub: isSingle ? "Me Mode" : "We Mode" }
```
On tap, show a mini bottom sheet with two options:
- **Me Mode** — Personal productivity & wellness
- **We Mode** — Shared with partner

Selecting "We Mode" when single → updates profile + navigates to `/connect`
Selecting "Me Mode" when coupled (no partner) → updates profile
Selecting "Me Mode" when coupled (has partner) → warns about disconnecting partner first

## Files to create/edit:
1. **`src/pages/PostAuthSetup.tsx`** — New post-auth setup page (mode select + name)
2. **`src/App.tsx`** — Add `/setup` route, redirect new users there
3. **`src/pages/ProfilePage.tsx`** — Add app mode toggle setting with bottom sheet

