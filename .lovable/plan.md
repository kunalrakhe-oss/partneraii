

# Add Me/We Mode Toggle on Auth Page

## What
Add a compact mode toggle (Me Mode / We Mode) on the auth page, positioned between the hero image and the sign-in/sign-up form. It reads from and writes to `localStorage("lovelist-app-mode")` so the chosen mode carries through to the post-auth setup flow.

## Changes

### `src/pages/AuthPage.tsx`
1. Add state: `const [appMode, setAppMode] = useState(() => localStorage.getItem("lovelist-app-mode") || "single")`
2. On toggle change, update state + `localStorage.setItem("lovelist-app-mode", value)`
3. Add a styled toggle below the subtitle (line 89), before the sign-in/sign-up tabs:
   - Two-option pill toggle (similar style to the login/signup tabs) with `User` icon + "Me Mode" and `Users` icon + "We Mode"
   - Highlighted state matches the existing tab styling

### `src/pages/PostAuthSetup.tsx`
4. Read `localStorage.getItem("lovelist-app-mode")` to pre-select the mode on the setup page, so it respects the user's earlier choice (session-only, as previously agreed).

