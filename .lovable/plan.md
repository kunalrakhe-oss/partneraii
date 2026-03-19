

# Plan: Replace Pillar Bubbles with a Compact Feature Grid

## What changes

Replace the current 4 big circular pillar buttons + fullscreen orbital overlay with a **flat, compact grid of all features** — no nesting, no overlay, no two-tap navigation. Every feature is one tap away.

## New design

A simple scrollable grid of small icon+label items, grouped under thin pillar headers. Takes roughly half the vertical space of the current bubbles.

```text
Life Pillars
┌─────────────────────────────────┐
│ 💚 Healthy                      │
│ [Workout] [Diet] [Health]       │
│ [Physio] [Postpartum] [Men's]   │
│                                 │
│ ✨ Happy                        │
│ [Mood] [Memories] [Baby] [Chat] │
│                                 │
│ 💰 Wealthy                      │
│ [Finance] [Lists]               │
│                                 │
│ 🎯 Successful                   │
│ [Tasks] [Calendar] [Events]     │
│ [Safety]                        │
└─────────────────────────────────┘
```

Each item: small 40px icon circle + label below, arranged in a wrapping flex row (4 per row). Tap goes directly to the page. No overlay, no orbit animation.

## File changes

### 1. `src/components/home/PillarGrid.tsx` — Rewrite

- Remove `FeatureBubbles` import entirely
- Inline the pillar data (same routes/icons) but render as:
  - For each pillar: a thin colored label header
  - Below it: a `flex flex-wrap gap-3` of small icon buttons (40px circles) with labels
  - Each button navigates directly via `useNavigate`
- Accept `isSingle` prop to conditionally show Chat
- Remove `uncheckedGroceries`, `pendingChores`, `totalEvents` props (unused in this simpler layout)

### 2. `src/components/FeatureBubbles.tsx` — Delete

No longer needed. The orbital overlay logic is removed.

### 3. `src/pages/HomePage.tsx` — Update PillarGrid props

Remove the extra props (`uncheckedGroceries`, `pendingChores`, `totalEvents`) from the PillarGrid call since the simplified grid doesn't use them.

