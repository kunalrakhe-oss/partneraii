

## Plan: Show User Mood on Home Screen + AI Mood Check-in Chat

### Problem
1. After logging a mood, the user's own mood is not visible on the home screen
2. No AI check-in happens after mood logging
3. In Me Mode, the partner mood section is hidden but nothing replaces it — no mood feedback at all

### Changes

#### 1. Show User's Own Mood on Home Screen (`src/pages/HomePage.tsx`)

Replace the `mood-check` widget behavior:
- Currently it only shows a "How are you feeling?" prompt when `!myMood`
- After mood is logged (`myMood` exists), show the user's mood with emoji, label, and note
- Add a "Change mood" button that navigates to `/mood`
- This works in both Me Mode and We Mode

#### 2. AI Mood Check-in After Logging (`src/pages/HomePage.tsx`)

When `myMood` is set:
- In **Me Mode**: Show an "AI checked in" card below the mood display that sends the user's mood to the `lovebot-chat` edge function and displays a short supportive AI response. Add a "Chat with AI" button linking to `/chat` (AI tab).
- In **We Mode**: Show the same AI check-in card, plus keep the existing partner mood section. The AI response references both moods when partner mood is available.

#### 3. Create a mood check-in edge function or reuse `mood-tip`

Reuse the existing `mood-tip` edge function — it already accepts `myMood`, `partnerMood`, and `weekHistory`. In Me Mode, `partnerMood` will be `null`, so it naturally adapts.

Display the mood-tip result as an "AI Check-in" card on the home screen (not gated behind subscription since the basic version uses the existing `mood-tip` function).

#### 4. Update `partner-mood` widget for We Mode

Keep existing partner mood section in We Mode. No changes needed — it already hides in single mode via `if (isSingle) return null`.

### Technical Details

**File: `src/pages/HomePage.tsx`**

- In the `mood-check` widget case (~line 516-532):
  - When `myMood` exists: render a card showing the user's emoji + mood label + note, with a "Change" button
  - Below it, render an AI check-in message (fetch from `mood-tip` function on mount when myMood changes)
  - Add state: `aiMoodCheckin` (string), `aiMoodLoading` (boolean)
  - Add a `useEffect` that fires when `myMood` changes to call `supabase.functions.invoke("mood-tip", { body: { myMood: myMood.mood, partnerMood: isSingle ? null : partnerMood?.mood, weekHistory: "", language } })`
  - Display the response as a chat-bubble-style AI message with a "Chat with AI →" link to `/chat`

- When `!myMood`: keep existing "How are you feeling?" prompt (no change)

**No database changes required.** No new edge functions needed — reuses `mood-tip`.

