

## Plan

### 1. Dismiss AI Insight on Tap
The "LoveList AI Insight" card at the bottom of the home page will be made dismissable. Tapping the card (or an X button) will hide it for the session using local state (`insightDismissed`). The refresh button will still work to bring it back.

### 2. Create Workout Page
New page `src/pages/WorkoutPage.tsx` — a simple fitness tracker where couples can:
- Log workouts (type, duration, notes)
- See partner's recent workouts
- Track streaks together
- Data stored in a new `workouts` table in the database

### 3. Create Diet Page
New page `src/pages/DietPage.tsx` — a shared meal/diet tracker where couples can:
- Log meals (breakfast/lunch/dinner/snack with description)
- See partner's meals for the day
- Track water intake
- Data stored in a new `diet_logs` table in the database

### 4. Add Quick Links on Home Page
Add two new cards in the Quick Links grid on the home page (expanding from 3 to a 2-row layout or adjusting the grid) for **Workout** and **Diet**, with appropriate icons (Dumbbell and Apple/Utensils).

### 5. Add Routes
Register `/workout` and `/diet` routes inside the `AppLayout` in `App.tsx`.

### Database Changes
Two new tables with RLS:
- **workouts**: id, user_id, partner_pair, type (text), duration_minutes (int), notes (text), workout_date (date), created_at
- **diet_logs**: id, user_id, partner_pair, meal_type (text), description (text), calories (int nullable), log_date (date), created_at

Both with RLS policies allowing authenticated users to read/write within their partner_pair.

### Files to Create/Edit
- `src/pages/WorkoutPage.tsx` (new)
- `src/pages/DietPage.tsx` (new)
- `src/pages/HomePage.tsx` (dismiss insight + add quick links)
- `src/App.tsx` (add routes)
- Database migration for new tables

