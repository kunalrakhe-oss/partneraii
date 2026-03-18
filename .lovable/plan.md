

## Plan: Disable All PWA Install Prompts

Remove all home screen installation prompts (both the fullscreen modal on unauthenticated pages and the bottom banner on authenticated pages).

### Changes

1. **`src/App.tsx`** — Remove `<InstallPrompt />` and `<FullscreenPrompt />` components and their imports.

2. **`src/components/AppLayout.tsx`** — Remove `<PostAuthInstallPrompt />` component and its import.

3. Optionally delete the now-unused files:
   - `src/components/InstallPrompt.tsx`
   - `src/components/PostAuthInstallPrompt.tsx`
   - `src/components/FullscreenPrompt.tsx`
   - `src/hooks/usePWAInstall.ts`

