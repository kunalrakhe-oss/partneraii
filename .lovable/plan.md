

# Overdue Task Notifications + Completed Tasks Cleanup Prompt

## What We're Building

1. **Edge function `overdue-check`** that runs on a schedule, finds overdue chores and calendar events, and inserts notifications for the assigned users.
2. **Frontend prompt** that periodically asks users if they want to delete completed tasks to free up space.

## 1. Edge Function: `supabase/functions/overdue-check/index.ts`

- Uses the service role key to query all uncompleted chores with `due_date < today` and all uncompleted calendar events where `event_date < today` (or same day but `event_time` has passed).
- For each overdue item, checks if a notification already exists today for that item (deduplicate by matching `title` pattern + `created_at` date).
- Inserts a notification with `type: 'overdue'`, descriptive title (e.g., "Overdue: Clean kitchen"), and a `link` to `/chores` or `/calendar`.
- Notifies both `user_id` (creator) and `assigned_to` (if it's a different user).

## 2. Database: pg_cron Schedule

- Enable