

## Fix App Layout to Be Rock-Solid in Both Fullscreen and Browser

### Problem
The app has layout glitches — unwanted scrolling, content enlarging, and inconsistent sizing — caused by:
1. **`App.css`** applies `max-width: 1280px`, `padding: 2rem`, and `text-align: center` to `#root` — this is leftover Vite boilerplate that fights the mobile-first layout
2. **`html` and `body`** lack fixed viewport constraints (`height: 100dvh`, `overflow: hidden`) so the browser chrome and content can cause layout shifts
3. No `overscroll-behavior: none` to prevent pull-to-refresh / bounce effects in browsers
4. No `touch-action` constraints to prevent accidental zoom on double-tap

### Changes

**1. Delete `src/App.css`** — it's unused Vite boilerplate conflicting with the layout

**2. Update `src/index.css`** — add viewport-locking rules to `html`, `body`, and `#root`:
```css
html, body, #root {
  height: 100dvh;
  height: 100vh; /* fallback */
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
}

html {
  touch-action: pan-x pan-y; /* prevent double-tap zoom */
  -webkit-text-size-adjust: 100%; /* prevent text enlarging */
  text-size-adjust: 100%;
}
```

**3. Update `src/main.tsx`** — remove `import "./App.css"` if present (it's not currently imported, but verify)

**4. Update `src/components/AppLayout.tsx`** — ensure the main container uses `h-[100dvh]` with `overflow-hidden`, and the scrollable content area uses `overflow-y-auto` with `-webkit-overflow-scrolling: touch`:
- Change outer div from `min-h-[100dvh]` to `h-[100dvh] overflow-hidden` (fixed frame, no grow)
- The inner content div already has `overflow-y-auto` which is correct

**5. Update `index.html`** — add `user-scalable=no` to viewport meta to prevent pinch-zoom layout shifts on mobile browsers:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

### Result
The app will behave like a fixed native app shell in both browser and fullscreen — no bounce, no zoom, no content shift. Only the designated content area scrolls.

