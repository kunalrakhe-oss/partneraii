

## Plan: Comprehensive UI Audit and Home Screen Simplification

### Current Problems (Expert UI Audit)

**Home Page (Critical - most crowded)**
- 9+ stacked widgets requiring 3+ full scrolls on a 430px viewport
- "Make it Real" onboarding card takes ~40% of first viewport - too dominant
- Partnership Stats (2x2 grid) takes a full viewport height
- Partner Mood, Today's Agenda, Add Memory CTA, Feature Bubbles, Urgent Chores, AI Insight all compete for attention
- No clear visual hierarchy - everything looks equally important
- Feature Bubbles accordion is functional but adds 4 more rows to an already long page

**Calendar Page (1594 lines)**
- Massive monolithic file doing too much (diet form inline, recurring event expansion, multiple view modes)
- Functional but overwhelming - form modals are dense

**Chores Page (1198 lines)**
- Good UX patterns (filters, AI steps, linked items) but the add form is dense
- Settings menu with destructive actions (delete all) too easily accessible

**Lists/Grocery Page (818 lines)**
- Tab bar with 5+ list types can overflow - good horizontal scroll but tabs are small
- AI suggestions row adds clutter when empty

**Chat Page**
- Clean design, well-structured with tabs
- No major issues

**Mood Page**
- Clean emoji picker grouped by sentiment - good UX
- No major issues

**Profile Page (858 lines)**
- Dense settings list but appropriately uses bottom sheets
- Well organized

### Recommended Changes - Phase 1: Home Screen Simplification

Focus on the highest-impact page first. Goal: reduce home screen from 9+ widgets to 5 clean sections that fit in ~1.5 scrolls.

| # | Change | File |
|---|--------|------|
| 1 | **Remove Partnership Stats from home** | `HomePage.tsx` |
| 2 | **Remove Add Memory CTA** (accessible via Happy > Memories bubble) | `HomePage.tsx` |
| 3 | **Merge Today's Agenda into Next Event** as one compact "Today" card | `HomePage.tsx` |
| 4 | **Merge Partner Mood into Mood Check** as a compact side-by-side row | `HomePage.tsx` |
| 5 | **Shrink AI Insight** to a single-line collapsible bar | `HomePage.tsx` |
| 6 | **Make onboarding card dismissible** and smaller | `HomePage.tsx` |
| 7 | **Update default widget list** | `useLayoutPreferences.ts` |

### New Home Screen Layout (1.5 scrolls max)

```text
┌─────────────────────────────────────┐
│ Header (greeting + bell + avatars)  │
│                                     │
│ ┌─ Today Card ────────────────────┐ │
│ │ 📅 Next: Dinner Date  · 2 days │ │
│ │    3 events today    View All → │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Mood Row ──────────────────────┐ │
│ │ 😊 Me: Happy  │  😢 Her: Sad   │ │
│ │ AI: Take a moment to check in… │ │
│ └─────────────────────────────────┘ │
│                                     │
│  Stay Healthy                    ▼  │
│  Stay Happy                      ▶  │
│  Stay Wealthy                    ▶  │
│  Stay Successful                 ▶  │
│                                     │
│  Urgent Chores (compact)            │
│  ✨ AI tip (1-line, dismissible)    │
└─────────────────────────────────────┘
```

### Implementation Details

1. **Compact "Today" card**: Merges `next-event` and `today-agenda` into one card. Shows next event title + countdown on top, "X events today" as subtitle, links to calendar.

2. **Mood row**: Two equal halves in a horizontal flex - left is my mood, right is partner mood. Both tappable. AI check-in becomes a small text line below. If no mood logged, shows compact "Log mood" CTA.

3. **Removed widgets stay in `ALL_HOME_WIDGETS`** so users who customized their layout keep access, but default order becomes: `["next-event", "mood-check", "quick-links", "urgent-chores", "ai-insight"]`.

4. **Onboarding card**: Add dismiss button, reduce vertical padding, condense 3 steps to inline chips.

5. **No database changes needed.**

