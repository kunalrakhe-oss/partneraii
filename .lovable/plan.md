## Add Sign in with Google

Lovable Cloud manages Google OAuth automatically — no API keys or configuration needed from you. The user can sign in with their Google account immediately.

### Changes

**1. Update `src/pages/AuthPage.tsx`**
- Import the `lovable` helper from `@/integrations/lovable`.
- Add a "Continue with Google" button above the email/password form (visible in both Sign In and Sign Up modes, hidden in Forgot Password mode).
- Add a small "or" divider between the Google button and the email form.
- On click, call `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` and handle errors with a toast.
- Style the button to match the existing design system (white/card background, Google "G" icon, same height/rounding as other inputs).

### Technical details
- Uses Lovable Cloud's managed Google OAuth — no extra setup.
- Existing `AuthContext` already listens to `onAuthStateChange`, so successful Google sign-in will automatically update the session and route the user past the auth screen.
- For new Google users, the existing `handle_new_user` DB trigger will auto-create their `profiles` row using the name from Google.
- No database, edge function, or secret changes required.
