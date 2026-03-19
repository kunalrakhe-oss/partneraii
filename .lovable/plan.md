

## Personalized Home Screen with AI-Powered Onboarding

### What We'll Build

1. **Extended Onboarding Questions** — After name entry in PostAuthSetup, add 2-3 quick preference screens:
   - "What matters most to you?" (multi-select: Health & Fitness, Financial Goals, Relationship, Productivity, Mental Wellness)
   - "What does your typical morning look like?" (single-select: Rushed, Relaxed, Workout, Planning)
   - Responses saved to a new `user_preferences` table

2. **New DB Table: `user_preferences`** — Stores onboarding answers per user:
   - `user_id`, `priorities` (text[]), `morning_routine` (text), `daily_goals` (text[]), `created_at`, `updated_at`

3. **"Start Your Day" Intent Picker on Home Screen** — A new card at the top of HomePage (below greeting, above widgets) that appears once per session:
   - "How do you want to start today?" with 4-5 tappable options (e.g., "Plan my day", "Check my health", "Manage finances", "Connect with partner", "Just browse")
   - Selecting an intent navigates to the relevant page or reorders the dashboard focus
   - Dismissed after selection, stored in sessionStorage

4. **AI-Personalized Dashboard** — Use the saved preferences + daily intent to:
   - Reorder/highlight widgets relevant to the user's chosen priorities
   - Show a personalized AI greeting that references their goals (via existing `daily-insight` edge function, enhanced with preference context)

5. **Edge Function Update: `daily-insight`** — Pass user preferences as additional context so the AI insight reflects their personal goals and priorities

### Technical Details

- **PostAuthSetup.tsx**: Add 2 new steps ("priorities" and "morning") after "name", with animated transitions
- **Database migration**: Create `user_preferences` table with RLS policies (user can only read/write own row)
- **HomePage.tsx**: Add `DayIntentPicker` component shown once per session; fetch preferences to customize widget ordering and AI context
- **daily-insight edge function**: Accept `preferences` in the request body and include in the system prompt
- No new dependencies required — uses existing Framer Motion, Supabase client, and edge function patterns

### File Changes

| File | Change |
|------|--------|
| `supabase/migrations/...` | Create `user_preferences` table + RLS |
| `src/pages/PostAuthSetup.tsx` | Add priority & morning routine steps |
| `src/pages/HomePage.tsx` | Add DayIntentPicker card, fetch preferences, pass to insight |
| `supabase/functions/daily-insight/index.ts` | Include user preferences in AI prompt |

