

## Auto-Install PWA

Unfortunately, browsers do not allow programmatic PWA installation without user interaction. The `beforeinstallprompt` event can be captured and its `.prompt()` method called, but **only in response to a user gesture** (tap/click). This is a browser security restriction that cannot be bypassed.

What your app already does is the best possible approach:
1. Captures the `beforeinstallprompt` event automatically
2. Shows a custom install banner after 2 seconds
3. When the user taps "Install", it triggers the native browser install dialog

There is no way to skip that final browser confirmation dialog — the user must always explicitly confirm installation.

### What we *can* do to maximize installs

- **Make the prompt more prominent** — show it as a full-screen overlay or modal instead of a small bottom banner
- **Show it immediately** instead of waiting 2 seconds
- **Remove the "Not now" option** on first visit (only show dismiss after repeated views)
- **Add install prompts at key moments** — e.g., after completing onboarding, or after first login

No code changes are needed unless you'd like one of these enhancements.

