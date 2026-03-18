

# Fix Google Sign-In to Show Account Picker

## Problem
Google sign-in auto-selects the account without letting the user choose which Gmail account to use.

## Solution
Add `prompt: "select_account"` to the Google OAuth `extraParams` in `AuthPage.tsx`. This forces Google to show the account selection screen every time.

## Change
**`src/pages/AuthPage.tsx`** — Update `handleGoogleSignIn`:
```typescript
const { error } = await lovable.auth.signInWithOAuth("google", {
  redirect_uri: window.location.origin,
  extraParams: {
    prompt: "select_account",
  },
});
```

Single line change, one file.

