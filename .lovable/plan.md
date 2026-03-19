

## Plan: Make Lists Attachable to Chores (with All Child Items)

### Current State
- Chores can link to **individual** grocery_items via `chore_linked_items` table
- The list picker in the "Add Chore" form shows items one-by-one filtered by list type (Grocery, To-Do, Gift, etc.)
- Lists are not separate entities — they're just `list_type` values on `grocery_items`

### What Changes

**Goal**: Add a "Select Entire List" option in the chore's list picker so tapping a list type (e.g., "Grocery") links all its current items to the chore at once. Individual item selection remains available too.

### Files to Change

| File | Change |
|------|--------|
| `src/pages/ChoresPage.tsx` | Add "Select All" toggle per list type in the list picker. When a list tab is active, show a "Link all [X] items" button that selects/deselects all items of that list type. Also add a visual indicator showing "Entire list linked" vs partial. |

### UI Behavior

```text
Link List Items:                    2 selected
┌─────────────────────────────────────────────┐
│ [All] [🛒 Grocery] [📋 To-Do] [🎁 Gift]   │
├─────────────────────────────────────────────┤
│ [☑ Select all Grocery items (6)]            │  ← NEW: bulk toggle
├─────────────────────────────────────────────┤
│ ☑ Milk                          🛒 Grocery  │
│ ☑ Eggs                          🛒 Grocery  │
│ ☑ Bread                         🛒 Grocery  │
│ ...                                         │
└─────────────────────────────────────────────┘
```

### Implementation Details

1. **"Select All" button per list type**: When a specific list tab is active (not "All"), show a checkbox/button at the top: "Select all [list_name] items ([count])". Tapping it adds all item IDs of that list type to `selectedLinkedItems`. Tapping again removes them.

2. **"All" tab bulk select**: When on the "All" tab, show a "Select all" button that selects every item across all list types.

3. **Visual feedback**: The selected count badge already exists (`{selectedLinkedItems.length} selected`). After linking, the expanded chore card already shows linked items grouped — no change needed there.

4. **No database changes needed** — the existing `chore_linked_items` table already supports linking any number of items to a chore. We're just making bulk selection easier in the UI.

