

## Plan: Bubble-Style Feature Navigation on Home Screen

### What Changes

Replace the current four-section grid layout (Stay Healthy / Happy / Wealthy / Successful) with an interactive bubble UI:

- **4 large pillar bubbles** displayed in a 2x2 layout, each with an icon, label, and distinct color
- **Tapping a pillar bubble** expands it to reveal its child feature bubbles in an animated circular/grid arrangement
- **Tapping a child bubble** navigates to that feature page
- **Tapping outside or a back button** collapses the expanded view

```text
  Default State:                    Expanded State (e.g. "Healthy" tapped):
  ┌───────────────────┐            ┌───────────────────┐
  │  (🏥)      (😊)   │            │    ← Stay Healthy  │
  │ Healthy   Happy   │            │                     │
  │                   │            │  (💪)  (🥗)  (🏃)  │
  │  (💰)      (🚀)   │            │  Fit   Diet  Work   │
  │ Wealthy  Success  │            │                     │
  └───────────────────┘            │  (🤰)  (🩺)  (🛡️)  │
                                   │  Baby  Physio Mens   │
                                   └───────────────────┘
```

### Files to Change

| File | Change |
|------|--------|
| `src/pages/HomePage.tsx` | Replace the `quick-links` widget case (~lines 685-799) with a new `FeatureBubbles` component that renders pillar bubbles and handles expand/collapse with AnimatePresence |

### Implementation Details

1. **Pillar bubbles**: Large circular elements (~80px) with gradient backgrounds, icon centered, label below. Arranged in a 2x2 grid with generous spacing.

2. **Expand animation**: When a pillar is tapped, use `AnimatePresence` + `motion.div` to:
   - Fade out the other 3 pillars
   - Show a header with pillar name + back arrow
   - Animate child bubbles in with staggered scale-up (spring animation)

3. **Child bubbles**: Smaller circles (~64px) with the feature icon, label below. Arranged in a 3-column grid. Each navigates to its route on tap.

4. **Collapse**: Tapping the back arrow or pillar header reverses the animation.

5. **Data structure stays the same** — the existing arrays of `{ to, icon, label, desc, gradient }` will be reused, just rendered as bubbles instead of cards.

6. **No database changes needed.**

