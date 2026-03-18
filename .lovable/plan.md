

## Plan: Make the App a Progressive Web App (PWA)

A PWA lets users "install" the app on their phone's home screen. When opened, it runs fullscreen (no browser address bar), feels like a native app, and works offline for cached pages.

### What will change

1. **Web App Manifest (`public/manifest.json`)**
   - Define app name ("LoveLists"), icons, theme color, background color
   - Set `"display": "standalone"` so it launches full