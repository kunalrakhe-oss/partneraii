

## Plan: Make Memories More Accessible

### Problem
Memories is hidden inside the "Stay Happy" accordion in Feature Bubbles — requires 2 taps to discover. No nav bar item, no direct link from header or quick links.

### Changes

| # | Change | File |
|---|--------|------|
| 1 | **Add "Memories" as an available nav tab** | `src/hooks/useLayoutPreferences.ts` — add `{ id: "memories", to: "/memories", label: "Memories" }` to `ALL_NAV_TABS` |
| 2 | **Register tab icon in AppLayout** | `src/components/AppLayout.tsx` — add `memories: { to: "/memories", icon: Camera, labelKey: "nav.memories" }` to `tabMeta` |
| 3 | **Add Memories to home Quick Links** | `src/pages/HomePage.tsx` — if a "quick-links" section exists with direct links, add a Memories shortcut there |

### Result
- Users can enable a Memories tab in their bottom nav bar from Profile settings
- Memories also appears as a quick-access shortcut on the home screen
- Existing Feature Bubbles path still works as before

