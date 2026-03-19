

## Add Sign In with Apple

Apple Sign In is supported by Lovable Cloud out of the box, using the same `lovable.auth.signInWithOAuth()` pattern already used for Google.

### Changes

**`src/pages/AuthPage.tsx`**
- Add a "Continue with Apple" button below the Google button
- Call `lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin })` on click
- Style with Apple's black button with the Apple logo icon

### Technical Details
- Uses existing `lovable` auth integration at `src/integrations/lovable/index.ts` — no new dependencies needed
- Same error handling pattern as Google sign-in
- Single file change

