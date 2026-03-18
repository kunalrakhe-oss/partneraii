

# Save & Track Recovery Plans Daily

## Overview
When a user generates a recovery plan (Physio or Postpartum), they can save it. The app then provides a daily tracking view where they check off exercises, log pain levels, and get AI encouragement throughout their recovery journey.

## Database Changes

### New table: `recovery_plans`
Stores the saved plan JSON and metadata.
- `id` UUID PK
- `user_id` UUID (references auth.users)
- `partner_pair` TEXT
- `plan_type` TEXT ('physio' | 'postpartum')
- `title` TEXT (e.g. "Knee Recovery Plan")
- `assessment_answers` JSONB (original answers)
- `plan_data` JSONB (full structured plan JSON)
- `current_phase` INTEGER DEFAULT 0
- `is_active` BOOLEAN DEFAULT true
- `started_at` TIMESTAMPTZ DEFAULT now()
- `created_at` TIMESTAMPTZ DEFAULT now()

### New table: `recovery_progress`
Tracks daily exercise completions and check-ins.
- `id` UUID PK
- `plan_id` UUID (references recovery_plans)
- `user_id` UUID
- `partner_pair` TEXT
- `log_date` DATE DEFAULT CURRENT_DATE
- `phase_index` INTEGER
- `exercise_name` TEXT
- `completed` BOOLEAN DEFAULT false
- `pain_level` INTEGER (0-10, nullable)
- `notes` TEXT (nullable)
- `created_at` TIMESTAMPTZ DEFAULT now()

RLS: Users can CRUD own records, SELECT by partner_pair.

## Frontend Changes

### PhysioPage & PostpartumPage
- Add a **"Save Plan"** button on the plan view (next to Retake/Ask Follow-up)
- On save: insert plan into `recovery_plans`, then navigate to the new tracking tab
- Add a 4th tab: **"My Plan"** (or show it when a saved plan exists)
- On page load, check if user has an active saved plan — if so, show "My Plan" tab by default instead of assessment

### New: Recovery Tracker UI (within the plan pages)
The "My Plan" tab shows:
1. **Today's Exercises** — the current phase's exercises as checkable cards (tap to mark done)
2. **Daily Check-in** — pain level slider (0-10) + optional note
3. **Progress Overview** — streak counter, % of exercises completed this week, phase progress bar
4. **Phase Navigation** — user can advance to next phase when ready (or AI suggests it)
5. **AI Recovery Assistant** — contextual button that sends current progress to the chat for personalized advice ("Day 12, completed 85% of Phase 1 exercises, pain level dropped from 6 to 3")

### RecoveryPlanCard updates
- Add a `completable` prop — when true, shows a checkbox to mark exercise as done
- Completed exercises get a subtle green checkmark overlay

### Home Page
- If user has an active recovery plan, show a **"Recovery: Day X"** card on HomePage with today's progress summary and quick link

## Edge Function Changes
None needed — saving/loading uses direct database queries. The existing chat functions already work for follow-up questions.

## Flow
```text
Assessment → Generate Plan → [Save Plan] → My Plan tab
                                              ├── Today's Exercises (checkable)
                                              ├── Daily Check-in (pain + notes)
                                              ├── Progress (streak, %, phase)
                                              └── AI advice (contextual chat)
```

## Files to Create/Edit
- **Migration**: Create `recovery_plans` and `recovery_progress` tables with RLS
- `src/pages/PhysioPage.tsx` — add save button, "My Plan" tab, load saved plan on mount
- `src/pages/PostpartumPage.tsx` — same changes
- `src/components/RecoveryPlanCard.tsx` — add `completable` checkbox mode
- `src/pages/HomePage.tsx` — add active recovery plan card

