

## Plan: Smart AI Command Bar + Fix Build Errors

### Overview
Add a universal AI-powered prompt field (command bar) that lets users create items across the app using natural language. For example: "Remind me to buy groceries tomorrow", "Add a chore to clean the kitchen", "Log a happy memory about our dinner date". The AI parses intent and creates the appropriate database entry.

Also fix the build error in 3 edge functions using an incompatible Supabase import.

---

### Part 1: Fix Build Errors (3 edge functions)

**Files:** `supabase/functions/check-subscription/index.ts`, `supabase/functions/create-checkout/index.ts`, `supabase/functions/customer-portal/index.ts`

- Change `import { createClient } from "npm:@supabase/supabase-js@2.57.2"` to `import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"`

---

### Part 2: New Edge Function — `smart-create`

**File:** `supabase/functions/smart-create/index.ts`

- Accepts a natural language prompt from the user
- Uses Lovable AI (Gemini) with **tool calling** to extract structured output
- Defines tools for each entity type:
  - `create_calendar_event` — title, date, time, category, reminder
  - `create_chore` — title, due_date
  - `create_grocery_item` — name, list_type (grocery/todo/gift/travel/date)
  - `create_memory` — title, description, type, date
  - `create_mood_log` — mood, note
- The AI determines the user's intent and calls the right tool
- The function returns the parsed action + data back to the client
- The client then inserts into the appropriate table using the Supabase SDK (keeping RLS intact)

---

### Part 3: Smart Command Bar UI Component

**File:** `src/components/SmartCommandBar.tsx`

- A floating input field above the bottom nav bar (or a sticky bar at the top of the home page)
- Includes a sparkle/wand icon and placeholder text like "Ask AI to create anything..."
- On submit:
  1. Calls `smart-create` edge function with the prompt
  2. Receives structured response (e.g., `{ action: "create_chore", data: { title: "Clean kitchen", due_date: "2026-03-20" } }`)
  3. Inserts into the correct table via Supabase client
  4. Shows a success toast with what was created and a link to view it
- Supports animated loading state while AI processes
- Works in both Me Mode and Couple Mode

---

### Part 4: Integration into AppLayout

**File:** `src/components/AppLayout.tsx`

- Add `SmartCommandBar` above the bottom nav or as a collapsible bar on the home page
- Show on all pages, positioned just above the navigation tabs

---

### Technical Details

- Edge function uses tool calling to extract structured data (no fragile JSON parsing)
- Tool schemas define required fields with enums for categories/types matching existing DB columns
- Client-side insertion preserves RLS (user_id + partner_pair set on insert)
- The command bar reads `partnerPair` from the hook to include in inserts
- `supabase/config.toml` updated with `verify_jwt = false` for the new function

