

## Clear All User Profiles & Force Fresh Setup

### What's already done
Email OTP login is already the only login method — no changes needed there.

### What needs to happen

**1. Delete all user data from the database**

Run SQL DELETE statements (via the insert/data tool) to clear all user-facing tables. This forces every returning user through the post-auth setup flow (`/setup`) since their `display_name` will be gone.

Tables to clear (in dependency order to avoid FK issues):
- `chore_linked_items`
- `message_reactions`
- `memory_reactions`
- `recovery_progress`
- `recovery_plans`
- `diet_plans`
- `diet_logs`
- `budget_entries`
- `calendar_events`
- `chat_messages`
- `chores`
- `grocery_items`
- `health_metrics`
- `location_shares`
- `memories`
- `mood_logs`
- `notifications`
- `partner_invites`
- `period_logs`
- `push_subscriptions`
- `relationship_details`
- `user_preferences`
- `workouts`
- `profiles`

**2. Clear localStorage setup flag in code**

Update `src/App.tsx` to remove `lovelist-setup-done` from localStorage on app load, ensuring returning users are routed to `/setup` even if they had a cached flag.

### No schema or auth changes needed
- The email OTP flow is already the only login method
- The `/setup` post-auth flow already exists and will trigger for any user missing a `display_name`
- No tables need structural changes

### Impact
- All existing users will need to re-enter their name, mode, and preferences on next login
- All stored data (chores, meals, moods, chats, etc.) will be permanently deleted
- Auth accounts remain intact — users can still log in with the same email

