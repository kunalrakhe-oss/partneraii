

# Plan: Replace AI Chat Onboarding with Selectable Options + "Other"

## Current state
The `ai-interview` step is a free-form chat where users type answers to the AI. This is slow (API calls per message), awkward on mobile, and most users have common goals anyway.

## What we'll build
Replace the single `ai-interview` chat step with **3 quick tap-to-select screens**, each with predefined options as selectable chips and an "Other" text input. Then the AI generates a profile summary from the selections (one API call at the end).

### Flow
```text
Language → Mode → Name → Priorities → Life Goals → Daily Habits → AI generates profile summary → Done
```

### Step 1: Priorities (multi-select chips + Other)
Predefined: Health & Fitness, Financial Freedom, Career Growth, Relationships, Mental Wellness, Productivity, Education, Spirituality

### Step 2: Life Goals (multi-select chips + Other)  
Predefined: Become debt free, Earn first million, Run a marathon, Lose weight, Build a business, Learn a new skill, Travel the world, Buy a home, Get promoted

### Step 3: Daily Habits (multi-select chips + Other)
Predefined: Morning workout, Meditate 10 min, Track expenses, Read 30 min, Meal prep, Journal, Walk 10k steps, No screen before bed

After step 3, one API call to `ai-coach` with `onboarding: true` sends all selections. The AI returns a `build_profile` with a motivational `profile_summary` and recommended `morning_routine`. Show the profile card, user confirms, done.

### Changes

1. **`src/pages/PostAuthSetup.tsx`** — Replace `ai-interview` step with 3 new steps: `priorities`, `life-goals`, `daily-habits`. Each step:
   - Grid of selectable chip buttons (multi-select, toggle on/off)
   - "Other" input field at the bottom to type custom entries
   - Continue button (require at least 1 selection)
   - After the last step, call AI once to generate `profile_summary` and `morning_routine`, show confirmation card

2. **`supabase/functions/ai-coach/index.ts`** — Simplify onboarding mode: instead of conversational back-and-forth, accept pre-selected `priorities`, `life_goals`, `daily_goals` arrays in the request body. AI just generates a `profile_summary` and `morning_routine` recommendation in one shot.

3. **Remove** unused chat UI code (ChatMessage interface, scrollRef, chatInput state, etc.)

### UX details
- Chips use the same card styling as language/mode selection (rounded, border highlight on select, checkmark)
- "Other" field: small text input with a "+" button to add custom items as chips
- Each screen has a progress indicator (dots or step count)
- Minimum 1 selection per step to continue
- Final AI call shows a brief loading state, then the profile card

### Technical details
- No streaming needed — single request/response
- Edge function onboarding mode becomes simpler: receives structured data, generates summary
- All selections saved to `user_preferences` table (priorities, life_goals, daily_goals, morning_routine, profile_summary)

