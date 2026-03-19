

## Plan: Show Linked List Items on Chore Events in Calendar View

### Overview
When chore items appear in the calendar, show their linked list items (grocery items, to-do items, etc.) in an expandable/collapsible section directly on the chore event card. Users can tap a chore card to expand and see all attached list items with checkboxes.

### Changes

**1. Fetch linked items in CalendarPage (`src/pages/CalendarPage.tsx`)**

- In `refreshEvents`, after fetching chores, also fetch `chore_linked_items` and their corresponding `grocery_items` (same pattern as ChoresPage)
- Store linked items in a state map: `Record<string, GroceryItem[]>` keyed by chore ID
- Pass this map down to WeekView, DayView, and ListView components

**2. Add expandable linked items UI to chore event cards**

- In the event card rendering (WeekView selected events, ListView, DayView), detect `_source === "chore"` events
- Show a small indicator (e.g., "📋 3 items") on chore cards that have linked items
- On tap, instead of opening the edit modal for chore events, toggle an expandable section showing the linked list items
- Each linked item shows: name, category icon, and a checkbox to toggle `is_checked` on the grocery_items table
- Use a collapsible/accordion pattern for the expand/collapse animation

**3. Update event card click behavior for chores**

- Currently chore clicks show a toast saying "tap checkmark to toggle." Change this so clicking a chore card with linked items expands/collapses the linked items list
- Keep the completion toggle button (checkmark) on the right side for the chore itself

### Technical Details

- Reuse the `chore_linked_items` + `grocery_items` fetch pattern from ChoresPage
- Extract `_sourceId` from chore events (strip the `chore-` prefix) to look up linked items
- Track expanded chore IDs in local state: `Set<string>`
- Toggling a linked item's checkbox calls `supabase.from("grocery_items").update({ is_checked: !current })` and refreshes

