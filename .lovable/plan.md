

## Plan: Merge Quick Add (AI) + Page FAB into One Unified Button

### Problem
Currently there are two floating buttons competing for space:
- **Quick Add** (left side) — AI-powered suggestions + free-text command bar
- **Page FAB** (right side, per-page) — simple "+" button that opens page-specific add forms (events, chores, groceries, memories)

### Solution
Replace both with a **single FAB on the right side** that, when tapped, shows a combined menu:
1. **Page-specific action** at the top (e.g., "Add Event" on Calendar, "Add Chore" on Chores) — direct, no AI
2. **AI suggestions row** below — the horizontal scrollable chips from smart-suggestions
3. **Free-text input** at the bottom — "Or type your own..."

### How It Works

**Step 1: Make SmartCommandBar context-aware**
- Accept an optional `pageAction` prop: `{ label, icon, onTap }` describing the current page's direct-add action
- When expanded, show the page action button prominently at top, then AI suggestions + input below
- Move the FAB to the **right side** with the existing `love-gradient` style (matching current page FABs)

**Step 2: Remove per-page FABs**
- Remove the standalone `<Plus>` FAB from these 5 pages:
  - `HomePage.tsx` (Add Event)
  - `CalendarPage.tsx` (Add Event / Add Diet — has sub-menu)
  - `ChoresPage.tsx` (Add Chore)
  - `GroceryPage.tsx` (Add Item)
  - `MemoriesPage.tsx` (Add Memory)

**Step 3: Pass page actions from each page to the layout**
- Use a lightweight React context (`PageFabContext`) in `AppLayout.tsx`
- Each page calls `usePageFab({ label: "Add Event", icon: Plus, onTap: () => setShowAddEvent(true) })` on mount
- `SmartCommandBar` reads from this context to know what page-specific action to show
- Pages with multiple actions (Calendar) pass an array

**Step 4: Combined UI when expanded**

```text
┌─────────────────────────────────┐
│ [📅 Add Event] [🍽 Add Diet]    │  ← Page-specific (if any)
├─────────────────────────────────┤
│ 🧹 Clean kitchen  📝 Log mood  │  ← AI suggestions (scrollable)
│ 🛒 Buy groceries   [↻ More]    │
├─────────────────────────────────┤
│ ✨ Or type your own...    [Send]│  ← Free text input
└─────────────────────────────────┘
                          [× FAB] ← Collapsed: gradient "+" button
```

### Files to Change

| File | Change |
|------|--------|
| `src/contexts/PageFabContext.tsx` | **New** — context + hook for pages to register their FAB actions |
| `src/components/SmartCommandBar.tsx` | Consume PageFabContext, move FAB to right, show page actions in expanded panel |
| `src/components/AppLayout.tsx` | Wrap content in `PageFabProvider` |
| `src/pages/HomePage.tsx` | Remove FAB, add `usePageFab()` hook call |
| `src/pages/CalendarPage.tsx` | Remove FAB + fab menu, add `usePageFab()` with 2 actions |
| `src/pages/ChoresPage.tsx` | Remove FAB, add `usePageFab()` |
| `src/pages/GroceryPage.tsx` | Remove FAB, add `usePageFab()` |
| `src/pages/MemoriesPage.tsx` | Remove FAB, add `usePageFab()` |

### Behavior
- **Collapsed**: Single gradient "+" button, bottom-right (replaces all per-page FABs)
- **Tap to expand**: Shows page actions + AI suggestions + input
- **Tap page action**: Runs the page's add form directly (same as before)
- **Tap AI suggestion**: Runs smart-create (same as before)
- **Type custom text**: Runs smart-create (same as before)
- **Pages without FAB actions** (e.g., Profile): Just shows AI suggestions + input

