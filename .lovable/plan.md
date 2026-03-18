

# Rebuild Recovery Plans with Visual Exercise Cards & Structured UI

## Problem
Currently, all AI-generated plans (Physio, Postpartum, Workout warmup/cooldown, Budget, Health) render as raw markdown text via `ReactMarkdown`. This looks like "bot written text" — walls of text with no visual structure or exercise images.

## Solution
Switch from streaming markdown plans to **structured JSON responses** (like the Workout page already does for exercises) and render them as **beautiful card-based UIs with AI-generated exercise illustrations**.

## Pages to Rebuild

### 1. PhysioPage — Recovery Plan
- Change edge function `physio-chat` to return **structured JSON** via tool calling (like `fitbot-chat` already does) instead of streaming markdown
- JSON structure: phases array, each with exercises containing `name`, `sets`, `reps`, `holdTime`, `difficulty`, `formTips`, `icon`, `imagePrompt`
- Render as phased cards: Phase 1 → Phase 2 → Phase 3, each with exercise cards showing icon, sets/reps, and an AI-generated illustration
- Use `google/gemini-3.1-flash-image-preview` to generate exercise illustration images on-demand (one per exercise)
- Store generated images in a Supabase storage bucket (`exercise-images`) so they're cached

### 2. PostpartumPage — Recovery Plan
- Same approach: structured JSON via tool calling in `postpartum-chat`
- JSON structure: weekly phases with exercises, nutrition tips, mental health cards
- Render as timeline cards with illustrations for exercises (breathing, pelvic floor, gentle stretches)

### 3. BudgetPage — Financial Plan
- Return structured JSON: budget breakdown, savings targets, action items
- Render as visual cards: pie chart for budget allocation, progress bars for goals, action item checklists
- No exercise images needed — use icons and charts instead

### 4. HealthPage — AI Insights
- Return structured JSON: health scores, trend predictions, recommendations
- Render as dashboard cards: score gauges, trend arrows, recommendation cards with icons

## Shared Components to Create

### `RecoveryPlanCard` component
- Renders a single exercise/action item as a visually rich card
- Shows: emoji icon, exercise name, sets/reps/duration, difficulty badge, form tips expandable, and optional illustration image
- Consistent design across Physio and Postpartum pages

### `PlanPhaseSection` component  
- Renders a phase/section header with progress indicator
- Contains list of `RecoveryPlanCard` items

### `ExerciseImageGenerator` 
- Takes an exercise description, calls edge function to generate an illustration
- Caches result in storage bucket
- Shows skeleton loader while generating
- Lazy-loads images (only generates when card is visible/expanded)

## Edge Function Changes

### `physio-chat` — Add structured plan generation
- Add tool calling (like `fitbot-chat`) with `create_recovery_plan` function
- Returns JSON: `{ phases: [{ title, description, exercises: [{ name, description, sets, reps, holdTime, icon, difficulty }] }], painManagement: {...}, nutrition: {...}, redFlags: [...] }`

### `postpartum-chat` — Add structured plan generation  
- Add tool calling with `create_postpartum_plan` function
- Returns JSON: `{ timeline: [{ week, title, exercises, nutritionTips, mentalHealth }], redFlags: [...] }`

### New `generate-exercise-image` edge function
- Takes exercise name + description
- Uses `google/gemini-3.1-flash-image-preview` to generate a simple, clean illustration
- Returns base64 image, which frontend uploads to storage bucket for caching

## Database Changes
- Create `exercise-images` storage bucket (public) for caching generated illustrations
- No new tables needed

## Technical Details
- Exercise image generation is **opt-in** — user taps "Show illustration" on a card to trigger generation (avoids mass API calls)
- All structured plans still have a "Ask Follow-up" button linking to the existing chat tab
- The chat tab remains unchanged (streaming markdown is fine for conversational responses)
- Budget and Health pages use charts/icons instead of AI images (more appropriate for financial/health data)

## Files to Create/Edit
- `src/components/RecoveryPlanCard.tsx` — new shared exercise card component
- `src/components/PlanPhaseSection.tsx` — new phase section component  
- `supabase/functions/generate-exercise-image/index.ts` — new edge function for illustrations
- `src/pages/PhysioPage.tsx` — rebuild plan tab with structured cards
- `src/pages/PostpartumPage.tsx` — rebuild plan tab with structured cards
- `src/pages/BudgetPage.tsx` — rebuild plan tab with visual cards/charts
- `src/pages/HealthPage.tsx` — rebuild insights with dashboard cards
- `supabase/functions/physio-chat/index.ts` — add tool calling for structured JSON
- `supabase/functions/postpartum-chat/index.ts` — add tool calling for structured JSON
- `supabase/functions/finance-chat/index.ts` — add tool calling for structured JSON
- `supabase/functions/health-analytics/index.ts` — add tool calling for structured JSON
- `supabase/config.toml` — register new edge function
- Migration for `exercise-images` storage bucket

