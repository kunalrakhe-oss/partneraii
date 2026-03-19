

## AI Life Coach: Conversational Onboarding + Adaptive Home Screen

### What We'll Build

The core idea: replace static onboarding questions with a **conversational AI onboarding step** where users tell PartnerAI about their life goals, and the AI becomes an ongoing coach that builds, adjusts, and tracks plans based on real dialogue.

### 1. New Onboarding Step: "Life Goals" (Conversational)

After the existing priorities/morning screens, add a new step where users type or select their **life aspirations**:
- "What do you want to achieve?" — free-text input with smart suggestions (e.g., "Lose 10kg", "Save for a house", "Run a marathon", "Manage knee pain", "Eat healthier")
- AI parses this into structured goals saved to `user_preferences.daily_goals`
- This feeds the entire AI coaching experience going forward

### 2. Enhanced DayIntentPicker → "AI Check-In Card"

Replace the current static intent picker with a smarter card that:
- Shows a **personalized AI prompt** based on saved goals (e.g., "Your mom said her knee hurts — want to build a recovery plan?")
- Has a **mini chat input** right on the home screen where users can type what's on their mind (e.g., "I have knee pain today")
- AI processes the input via a new `ai-coach` edge function and either:
  - Navigates to the relevant page (physio, diet, workout) with context pre-filled
  - Creates a plan inline and offers to save it
  - Asks follow-up questions in a quick dialog

### 3. "Active Plans" Widget Enhancement

Currently shows recovery/diet plans. Enhance to:
- Show **today's schedule** from active plans (e.g., "Day 3: Knee stretches, 15 min walk")
- Show plan progress with a mini progress bar
- Allow quick "Done" tapping for today's tasks
- AI-generated plans from any feature (physio, diet, workout) all surface here

### 4. New Edge Function: `ai-coach`

A conversational edge function that:
- Receives user message + their preferences/goals + active plans
- Decides what action to take (create plan, modify plan, navigate, give advice)
- Uses tool-calling to return structured responses:
  - `navigate_to` — send user to a page with context
  - `create_plan` — generate a recovery/diet/workout plan
  - `modify_plan` — adjust an existing plan based on feedback
  - `daily_schedule` — return today's tasks from active plans
  - `chat_response` — just respond conversationally

### 5. Home Screen Reorder Based on Context

The home screen widget order adapts:
- Active plans always show at top (below greeting)
- AI check-in card appears if no intent picked yet
- Widgets reorder based on priorities (health-focused users see health widgets first)
- Birthday reminders and partner mood stay prominent

---

### Technical Details

**Database changes:**
- Add `life_goals` (text[]) column to `user_preferences` table
- No new tables needed — leverages existing recovery_plans, diet_plans, workouts

**New files:**
| File | Purpose |
|------|---------|
| `supabase/functions/ai-coach/index.ts` | Conversational AI coach with tool-calling |
| `src/components/AICoachCard.tsx` | Home screen mini-chat card replacing DayIntentPicker |

**Modified files:**
| File | Change |
|------|--------|
| `src/pages/PostAuthSetup.tsx` | Add "life goals" step with free-text + suggestions |
| `src/pages/HomePage.tsx` | Replace DayIntentPicker with AICoachCard; reorder widgets by priority; enhance active plan cards with today's schedule |
| `src/components/DayIntentPicker.tsx` | Deprecated — replaced by AICoachCard |
| `supabase/functions/daily-insight/index.ts` | Include life goals in context |

**AI Coach edge function design:**
- Uses Lovable AI gateway with tool-calling
- Tools: `navigate_to`, `create_recovery_plan`, `modify_plan`, `give_advice`, `show_schedule`
- Receives: user message, user_preferences (priorities, goals, morning_routine), active plans summary
- Returns structured action + optional message

**Example flow (user's mom with knee pain):**
1. Mom opens app → AICoachCard says "Good morning! How are you feeling today?"
2. Mom types "my knee hurts"
3. AI Coach processes → asks "How bad is the pain (1-10)? When did it start?"
4. Mom answers → AI generates a physio recovery plan
5. Mom says "I can't do squats" → AI modifies plan, removes squats
6. Plan saved → appears on home screen as "Recovery: Day 1" with today's exercises
7. Next day → card shows "Day 2: Gentle stretches (15 min)" with a "Start" button

