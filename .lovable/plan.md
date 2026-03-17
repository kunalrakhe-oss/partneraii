

## Plan: Add Recurrence/Frequency to Diet Items

### Problem
Users want diet items to repeat on a schedule (e.g., "chia seed water daily" or "papaya every Friday at 7 PM") and see them as recurring events on the shared calendar.

### Database Changes
Add two columns to `diet_logs`:
- `recurrence` (text, default `'once'`) — values: `once`, `daily`, `weekly`
- `recurrence_day` (integer, nullable) — day of week for weekly items (0=Sun, 1=Mon, ..., 5=Fri, 6=Sat)

### Diet Form Modal Changes
Add a **Frequency** selector after the Date/Time fields:
- Three pill buttons: **Once** | **Daily** | **Weekly**
- When "Weekly" is selected, show a row of 7 day-of-week buttons (S M T W T F S) to pick which day
- Pre-populate `recurrence_day` from the selected date

### Calendar Sync Logic
When adding/updating a diet item:
- **Once**: Create a single calendar event (current behavior)
- **Daily**: Create the calendar event with `recurrence: 'daily'` so the calendar page shows it every day
- **Weekly**: Create the calendar event with `recurrence: 'weekly'` and set `event_date` to the next occurrence of the chosen day

The `calendar_events` table already has a `recurrence` column supporting `once`, `daily`, `weekly`, `monthly` — so no calendar schema change needed.

### Diet Page Display
- Show a small badge on diet item cards indicating frequency (e.g., "🔁 Daily" or "🔁 Weekly · Fri")
- When fetching today's items, also fetch items where `recurrence = 'daily'` OR (`recurrence = 'weekly'` AND `recurrence_day` matches today's day of week), regardless of `log_date`

### DietItem Type Update
Add `recurrence` and `recurrence_day` to the `DietItem` interface.

### Files to Change
1. **New migration** — add `recurrence` and `recurrence_day` columns to `diet_logs`
2. **`src/pages/DietPage.tsx`** — update form modal, add item logic, update item logic, fetch logic, display badges

### Technical Details
- Fetch query changes from filtering only `log_date = today` to: items where `log_date = today` OR `recurrence = 'daily'` OR (`recurrence = 'weekly'` AND `recurrence_day = dayOfWeek`)
- Completion for recurring items is date-scoped: a daily item completed today should not show as completed tomorrow. This will use the existing `is_completed` + `log_date` — for recurring items, we create a new `diet_logs` row for each day's completion status (or toggle on the original and reset daily). Simpler approach: keep `is_completed` per-row, and for recurring items, auto-create today's instance if it doesn't exist yet.

