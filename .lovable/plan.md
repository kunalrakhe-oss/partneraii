

## Plan: Replace Health Tracker with Habit Tracker

Replace the current Health Tracker page at `/health` with a full Habit Tracker that lets users create, track, and visualize daily habits.

### Database Changes

**New table: `habits`**
- `id` (uuid, PK), `user_id` (uuid), `partner_pair` (text), `name` (text), `icon` (text, emoji), `color` (text), `frequency` (text: daily/weekly), `target_per_day` (int, default 1), `is_active` (bool, default true), `created_at`, `updated_at`
- RLS: user can CRUD own, SELECT by partner_pair

**New table: `habit_logs`**
- `id` (uuid, PK), `habit_id` (uuid FK->habits), `user_id` (uuid), `partner_pair` (text), `log_date` (date), `count` (int, default 1), `created_at`
- RLS: user can CRUD own, SELECT by partner_pair
- Unique constraint on (habit_id, log_date, user_id)

### Frontend Changes

**File: `src/pages/HealthPage.tsx`** — Completely rewrite as a Habit Tracker with two tabs:

1. **Today tab**: 
   - List of active habits as tappable cards
   - Each card shows habit name, icon, and a circular progress ring (completed/target)
   - Tap to increment completion count (like the water widget concept)
   - Long-press or minus button to decrement
   - "Add Habit" button opens a simple form (name, icon picker, color, frequency, daily target)
   - Daily streak counter per habit

2. **Stats tab**:
   - Weekly grid view (7-day heatmap-style) showing completion across all habits
   - Current streak and best streak per habit
   - Overall completion percentage

**File: `src/components/home/PillarGrid.tsx`** — Update label from "Health" to "Habits" at line 24

**File: `src/App.tsx`** — No route change needed (stays `/health`, just the page content changes)

### Visual Design
- Each habit card: glassmorphism card with emoji icon, name, and a circular progress indicator
- Tap animation using framer-motion (scale pulse on tap)
- Color-coded per habit (user picks from preset palette)

```text
┌─────────────────────────────┐
│  ✅ Today    📊 Stats        │  ← tabs
├─────────────────────────────┤
│  🏃 Morning Run    ●○○      │  ← 1/3 done, tap to add
│  💧 Drink Water    ●●●●○○○○ │  ← 4/8, tap to add  
│  📖 Read 30min     ●        │  ← done!
│  🧘 Meditate       ○        │  ← not yet
│                              │
│  [+ Add Habit]              │
└─────────────────────────────┘
```

### What stays the same
- The `health_metrics` table and existing data remain untouched
- Route path `/health` stays the same
- Edge functions for health analytics remain (unused but harmless)

