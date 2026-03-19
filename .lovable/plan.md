

## Plan: Vertical List Style with Drop-Down Bubbles

### What Changes

Replace the current 2x2 grid → full-page takeover with an **always-visible vertical list** of 4 pillar rows. Tapping a pillar toggles its children as a horizontal scrollable row of bubbles that "drops" in below it — accordion style. Multiple pillars can be open simultaneously.

```text
┌─────────────────────────────────────────┐
│ (🏥) Healthy                        ▼  │
│   ○ Workout  ○ Diet  ○ Health  ○ ...    │  ← drops in
├─────────────────────────────────────────┤
│ (😊) Happy                          ▶  │  ← collapsed
├─────────────────────────────────────────┤
│ (💰) Wealthy                        ▶  │
├─────────────────────────────────────────┤
│ (🚀) Successful                     ▶  │
└─────────────────────────────────────────┘
```

### File to Change

| File | Change |
|------|--------|
| `src/components/FeatureBubbles.tsx` | Rewrite layout: vertical list of pillar rows, each toggleable. Children render as a horizontally scrolling row of small bubbles with staggered drop-in animation. Remove `expandedPillar` single-select logic, use a `Set` for multi-expand. |

### Implementation Details

1. **Pillar rows**: Each pillar is a full-width row with icon + label on the left, chevron on the right. Tapping toggles that pillar's children.
2. **State**: `expandedPillars: Set<string>` — allows multiple open at once.
3. **Child bubbles**: Render inside `AnimatePresence` below each pillar row. Horizontal scroll (`flex overflow-x-auto`) with small circular bubbles. Each bubble drops in with a staggered spring animation (scale from 0 + slight translateY).
4. **No page takeover** — all 4 pillars remain visible, children slide in/out inline.

