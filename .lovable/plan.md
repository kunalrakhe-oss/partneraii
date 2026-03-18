

# Fix Sticky Headers on All Pages

## Problem
Page headers scroll away with content. They should stay fixed/sticky at the top while content scrolls beneath.

## Solution
On each page, make the header area `sticky top-0 z-20 bg-background` so it pins to the top during scroll. The scrollable content below continues normally.

## Pages to Update

All pages follow the same pattern: extract the header `div` and add `sticky top-0 z-20 bg-background` classes. Here's every page that needs the fix:

| Page | Current header wrapper | Change |
|------|----------------------|--------|
| **HomePage** | `<div className="px-5 pt-10 pb-6">` wraps everything | Split: header section gets `sticky top-0 z-20 bg-background px-5 pt-10 pb-3`, scrollable content below |
| **CalendarPage** | Already has `bg-background` but missing `sticky top-0 z-20` | Add `sticky top-0 z-20` |
| **ChoresPage** | Header inside scrollable div | Extract header, add `sticky top-0 z-20 bg-background` |
| **GroceryPage** | Same pattern | Same fix |
| **ChatPage** | Header inside flex column | Already `shrink-0`, add `sticky top-0 z-20 bg-background` |
| **DietPage** | Header inside scrollable div | Extract header, add sticky |
| **ProfilePage** | Header inside scrollable div | Extract header, add sticky |
| **MemoriesPage** | Header inside scrollable div | Extract header, add sticky |
| **WorkoutPage** | Already `shrink-0` in flex layout | Add `sticky top-0 z-20 bg-background` |
| **MoodPage** | Header inside scrollable div | Extract header, add sticky |
| **BudgetPage** | Header inside scrollable div | Extract header, add sticky |
| **HealthPage** | Header inside scrollable div | Extract header, add sticky |
| **UpgradePage** | Header inside scrollable div | Extract header, add sticky |
| **CoupleProfilePage** | Header inside scrollable div | Extract header, add sticky |
| **EventPlannerPage** | Header inside scrollable div | Extract header, add sticky |
| **BabyPlanPage**, **MensHealthPage**, **PhysioPage**, **PostpartumPage**, **SafetyCheckInPage** | Similar patterns | Same fix |

## Pattern
For each page, the change is consistent:
```tsx
// Before
<div className="px-5 pt-10 pb-28">
  {/* Header */}
  <div className="flex items-center justify-between mb-1">...</div>
  {/* Content */}
  ...
</div>

// After
<div className="pb-28">
  {/* Sticky Header */}
  <div className="sticky top-0 z-20 bg-background px-5 pt-10 pb-3">
    <div className="flex items-center justify-between mb-1">...</div>
  </div>
  {/* Scrollable Content */}
  <div className="px-5">
    ...
  </div>
</div>
```

## Files to Edit
All page files in `src/pages/` — approximately 20 files, each with the same structural change of wrapping the header in a sticky container.

