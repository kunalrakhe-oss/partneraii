

# Plan: Recreate Home Screen as a Personalized Life Dashboard

## Problem
The current HomePage is 861 lines of tightly coupled code — a monolith mixing mood popups, chore management, partner mood reactions, emoji pickers, and analytics fetching. It's visually cluttered with many widgets competing for attention rather than guiding the user toward their goals.

## Design Vision
A clean, focused **"Mission Control"** home screen that reflects PAI's core promise: *one AI that helps you live better*. Organized around the user's chosen priorities from onboarding, with clear visual hierarchy.

### Layout (top to bottom)

1. **Header** — Greeting + date + profile button + notification bell (keep existing logic, simplify)

2. **AI Coach Strip** — Compact glass card with a one-line personalized nudge from the AI coach + tap to expand into the chat. Replaces the large AICoachCard.

3. **Today's Focus Ring** — A horizontal scroll of 3-4 circular "focus cards" generated from the user's daily goals (from onboarding). Each shows an icon + short label (e.g., "Workout", "Read 30m", "Track Budget"). Tap toggles completion with a satisfying check animation. This is the centerpiece.

4. **Priority Pillars** — The 4 pillars (Healthy, Happy, Wealthy, Successful) as a 2x2 grid of glass cards. Each card shows the pillar icon, label, and a count/status line (e.g., "3 active plans", "Mood: Happy"). Tap opens the orbital feature picker (existing FeatureBubbles logic).

5. **Quick Glance Cards** — A horizontal scroll of compact stat cards:
   - Next event (date + title)
   - Pending chores count
   - Grocery items left
   - Streak/days active

6. **Active Plans Strip** — If user has active recovery/diet plans, show as a compact horizontal list of pill-shaped cards with plan name + day count.

7. **Daily Insight** — Small AI insight banner at the bottom (keep existing logic, compact UI).

### What gets removed/simplified
- Partner mood popup with emoji picker and reaction flow → move to dedicated Mood page
- Inline chore management (add chore form) → chores page only
- "Make it Real" demo banner → handled by DemoBanner component already
- Inline AddEventModal → calendar page
- Mood check-in cards → simplified to a single tap-to-log button inside "Happy" pillar
- 800+ lines → target ~300 lines by extracting sections into small components

### File Changes

1. **`src/pages/HomePage.tsx`** — Complete rewrite (~300 lines):
   - Keep data fetching hooks (profile, events, chores, preferences, plans)
   - Remove: mood popup, chore add form, emoji picker, reaction logic
   - New sections: TodayFocusRing, PillarGrid, QuickGlanceScroll, ActivePlansStrip
   - Import extracted components

2. **`src/components/home/TodayFocusRing.tsx`** — New component:
   - Horizontal scroll of daily goal chips from `user_preferences.daily_goals`
   - Tap to toggle check (local state, optionally persist)
   - Glass pill style with check animation

3. **`src/components/home/PillarGrid.tsx`** — New component:
   - 2x2 grid of the 4 pillars (reuse pillar data from FeatureBubbles)
   - Each card: icon + label + contextual subtitle
   - Tap opens the existing FeatureBubbles orbital popup

4. **`src/components/home/QuickGlanceScroll.tsx`** — New component:
   - Horizontal scroll of compact stat cards (next event, chores, groceries, streak)
   - Each card links to its respective page

5. **`src/components/home/AICoachStrip.tsx`** — New component:
   - Compact glass bar with AI sparkle icon + one-line greeting/nudge
   - Tap navigates to `/chat?tab=ai`

6. **Keep unchanged**: `FeatureBubbles.tsx` (reuse for orbital popup), `AICoachCard.tsx` (deprecated but not deleted yet), `ProfileButton.tsx`, `NotificationsPanel.tsx`, `PageTransition.tsx`, all hooks and contexts.

### Visual Style
- All cards use glass morphism (existing `rounded-glass`, `backdrop-blur-glass`, `shadow-card`)
- Focus ring items use `love-gradient` for completed state
- Pillar cards use subtle gradient backgrounds matching their theme color
- Horizontal scrolls use `overflow-x-auto scrollbar-hide` with `snap-x`
- Stagger animation on mount (existing framer-motion container/item pattern)

