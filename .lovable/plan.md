

## Enable Web Push Notifications for iPhone PWA

### The Problem
Your current setup has two notification systems, but neither works for a PWA installed on iPhone:
1. **`@capacitor/push-notifications`** — only works inside a native Capacitor app (`.ipa`), not a PWA
2. **`PartnerNotifications.tsx`** — uses in-app toast notifications, which only show while the app is open

Since you installed the **web app** (PWA) on your home screen, you need **Web Push API** notifications, which iOS supports since iOS 16.4+ for home screen PWAs.

### What We'll Build

**1. Create a Web Push notification hook (`src/hooks/useWebPush.ts`)**
- Check if the browser supports `Notification` API and service worker push
- Request notification permission from the user
- Subscribe to push using the service worker's `PushManager`
- Store the push subscription endpoint in the database (new `push_subscriptions` table)
- Falls back gracefully on unsupported browsers

**2. Add a service worker push handler (`public/sw-push.js`)**
- Listen for `push` events and display native OS notifications
- Handle `notificationclick` to open the app at the correct page (e.g., `/chat`, `/chores`)
- Register this alongside the existing VitePWA service worker

**3. Create a database table `push_subscriptions`**
- Columns: `id`, `user_id`, `endpoint`, `p256dh`, `auth`, `created_at`
- RLS: users can only manage their own subscriptions

**4. Create an edge function `send-push` (`supabase/functions/send-push/index.ts`)**
- Accepts `user_id`, `title`, `body`, `url` parameters
- Looks up the user's push subscription(s) from the database
- Sends a Web Push notification using the `web-push` protocol (VAPID)
- Requires generating VAPID keys (a one-time setup secret)

**5. Integrate push sending into existing notification triggers**
- Update the database trigger functions (`notify_partner_mood`, `notify_partner_chat`) to also call the `send-push` edge function via `pg_net`
- Update the `overdue-check` edge function to send push notifications for overdue items

**6. Add permission prompt in the app**
- Show a one-time prompt in `AppLayout.tsx` asking the user to enable notifications
- Store permission state so we don't re-ask

### Setup Requirement
You'll need to generate **VAPID keys** (a public/private key pair for Web Push). I'll generate these and store the private key as a secret, and embed the public key in the frontend.

### Files Changed/Created
- `src/hooks/useWebPush.ts` — new hook for Web Push subscription
- `public/sw-push.js` — push event handler service worker
- `src/components/PushPermissionPrompt.tsx` — one-time permission UI
- `src/components/AppLayout.tsx` — integrate permission prompt
- `supabase/functions/send-push/index.ts` — edge function to send push
- Database migration: `push_subscriptions` table + RLS policies
- Database migration: update trigger functions to call push edge function

### Important iOS Caveat
Web Push on iOS requires:
- iOS 16.4 or later
- The app MUST be added to home screen (which you've done)
- The user must explicitly grant notification permission when prompted

