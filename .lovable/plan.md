

# AI Diet Plan, Track & Transform

## Overview
Enhance the Diet page with three new capabilities:
1. **AI Diet Plan** — Generate a full personalized diet plan, save it, and track daily adherence (similar to recovery plan tracking)
2. **PDF/Image Upload** — Users upload their own diet plan as a PDF or photo; AI extracts and auto-fills the meal slots
3. **Manual entry** — Preserved as-is

## Database Changes

### New table: `diet_plans`
Stores saved AI or uploaded diet plans for daily tracking.
- `id` UUID PK
- `user_id` UUID
- `partner_pair` TEXT
- `title` TEXT DEFAULT 'My Diet Plan'
- `plan_data` JSONB (structured plan with meals per category)
- `goal` TEXT (e.g. "weight loss", "muscle gain", "maintain")
- `is_active` BOOLEAN DEFAULT true
- `started_at` TIMESTAMPTZ DEFAULT now()
- `created_at` TIMESTAMPTZ DEFAULT now()

RLS: Same pattern as `recovery_plans` — user CRUD own, SELECT by partner_pair.

No new progress table needed — `diet_logs` already tracks daily completion per meal item. The plan just pre-populates daily diet_logs entries.

## Edge Function Changes

### `dietbot-chat` — Add two new types:

**`type: "plan"`** — Generate a multi-day/weekly transformation diet plan:
- Input: goal (weight loss/gain/maintain), preferences, current weight, target, dietary restrictions
- Output via tool calling: structured JSON with daily meals across all 6 categories, weekly variation, calorie targets, transformation tips
- Schema: `{ title, goal, daily_calories, weeks: [{ week, focus, days: [{ day, meals: [{ meal_type, description, calories, notes, emoji }] }] }], tips: [] }`

**`type: "parse_upload"`** — Extract diet plan from uploaded image/PDF:
- Input: base64 image or text content from the uploaded file
- Uses `google/gemini-2.5-flash` (good at image+text extraction)
- Output via tool calling: same structured meal format mapped to the 6 categories
- Schema: `{ meals: [{ meal_type, description, calories, notes, emoji }], detected_goal, summary }`

## Frontend Changes

### DietPage.tsx — Add tabs and tracking

**New tab structure** at the top:
- **Today** (existing daily view with manual add + AI suggest)
- **My Plan** (saved plan tracking view — only shows if active plan exists)
- **Create Plan** (AI plan generator + upload option)

**"Create Plan" tab:**
1. Quick assessment form: goal selector (lose/gain/maintain), dietary preferences (veg/non-veg/vegan), allergies, activity level
2. "Generate AI Plan" button → calls `dietbot-chat` with `type: "plan"`
3. **OR** "Upload Your Plan" button → file picker for image/PDF
   - For images: convert to base64 and send to `dietbot-chat` with `type: "parse_upload"`
   - For PDFs: use `document--parse_document` style extraction on client, then send text to AI
   - Actually simpler: upload to storage, send base64 to edge function which uses Gemini vision
4. Shows generated plan as cards grouped by category
5. "Save & Start Tracking" button → saves to `diet_plans` table

**"My Plan" tab (when active plan exists):**
1. Shows current day's meals from the plan as checkable cards (reuse existing `CategorySection` with `is_completed` toggle)
2. On first visit each day, auto-creates `diet_logs` entries from the plan for today (if not already created)
3. Daily progress bar (already exists)
4. Weekly adherence summary (% completed per week)
5. "Get AI Advice" button — sends current progress to dietbot-chat for transformation tips
6. "End Plan" button to deactivate

**Today tab** — remains as-is with manual entry and quick AI suggestions.

### HomePage.tsx
- If user has active diet plan, show "Diet: Day X" card similar to recovery tracker card

## File Changes
- **Migration**: Create `diet_plans` table with RLS
- `supabase/functions/dietbot-chat/index.ts` — Add `plan` and `parse_upload` types
- `src/pages/DietPage.tsx` — Add tabs, plan creation UI, tracking view, upload flow
- `src/pages/HomePage.tsx` — Add active diet plan card

