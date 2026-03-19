

## Set Up Capacitor for Native Mobile App

Capacitor is not yet installed or configured in this project. Here's what needs to be done:

### 1. Install Capacitor dependencies
Add to `package.json`:
- `@capacitor/core` (dependency)
- `@capacitor/cli` (dev dependency)
- `@capacitor/ios`
- `@capacitor/android`

### 2. Create `capacitor.config.ts`
Configure with:
- **appId**: `app.lovable.0cb5398d93dd4c728790b35067ca1227`
- **appName**: `partneraii`
- **webDir**: `dist` (Vite's build output)
- **server.url**: `https://0cb5398d-93dd-4c72-8790-b35067ca1227.lovableproject.com?forceHideBadge=true` (enables live hot-reload from the Lovable preview)
- **server.cleartext**: `true`

### 3. Post-setup steps (you do locally)
After I make the code changes, you'll need to:
1. Export to GitHub and `git pull` locally
2. Run `npm install`
3. Run `npx cap add ios` and/or `npx cap add android`
4. Run `npm run build`
5. Run `npx cap sync`
6. Run `npx cap run ios` (requires Mac + Xcode) or `npx cap run android` (requires Android Studio)

### Files changed
- `package.json` — add 4 Capacitor packages
- `capacitor.config.ts` — new file with app config + live-reload server URL

