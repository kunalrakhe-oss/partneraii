

# Plan: AI-Powered Onboarding Profile Builder

## What's happening now
The current PostAuthSetup flow collects: language → mode → name → priorities → morning routine → life goals. These are static multiple-choice screens. The data is saved but the AI Coach on the home page doesn't deeply leverage it.

## What we'll build

A conversational AI onboarding step that replaces the static priorities/morning/goals screens with an **AI-driven interview**. After entering their name, users chat with the AI Coach which asks personalized questions, builds a comprehensive life profile, and creates an actionable plan.

### Flow

```text
Language → Mode → Name → AI Profile Interview → Done
```

The AI interview step will:
1. Greet the user by name and ask about their current life situation
2. Ask follow-up questions based on responses (career, health, finances, relationships, goals)
3. Suggest aspirational goals like "become debt free", "earn first million", "financial freedom", "run a marathon"
4. Summarize what it learned and show the user their generated profile
5. Save structured data to `user_preferences` (priorities, life_goals, daily_goals, morning_routine)

### New step: "ai-interview" in PostAuthSetup

- Replace the 3 static steps (priorities, morning, goals) with a single **chat-based AI interview screen**
- Uses the existing `ai-coach` edge function with a special `onboarding: true` flag
- The AI asks 3-5 questions conversationally, then returns a structured profile via tool-calling
- User sees a chat UI with the AI, then a profile summary card they confirm
- On confirm, data saves to `user_preferences` and profile, then navigates to home/connect

### Changes required

1. **`supabase/functions/ai-coach/index.ts`** — Add an `onboarding` mode that:
   - Takes the user's name and mode (single/couple)
   - Asks structured life questions conversationally
   - After enough context, returns a `build_profile` tool call with structured priorities, goals, morning routine
   - Uses motivational language: "financial freedom", "debt free", "earn your first million", "build wealth", "peak fitness"

2. **`src/pages/PostAuthSetup.tsx`** — Replace steps `priorities`, `morning`, `goals` with a single `ai-interview` step:
   - Chat UI (messages list + input)
   - AI asks questions, user responds naturally
   - When AI returns the profile summary, show a confirmation card
   - User taps "Looks great!" to save and proceed

3. **Minor**: Update `user_preferences` table to also store a `profile_summary` text field (AI-generated one-liner about the user) via migration.

### Technical details

- Edge function uses Lovable AI Gateway with `google/gemini-3-flash-preview`
- Tool-calling extracts structured output: `{ priorities: string[], life_goals: string[], morning_routine: string, daily_goals: string[], profile_summary: string }`
- Chat history maintained in component state (no persistence needed for onboarding)
- Streaming not required for onboarding — simple request/response is fine
- The AI interview is limited to ~5 exchanges to keep it fast

### Example AI conversation

> **AI**: Hey Rahul! I'm your AI Life Coach. Tell me — what's the one area of your life you most want to improve right now?
>
> **User**: I want to get fit and save more money
>
> **AI**: Love that! 💪 Getting fit and building wealth — those are powerful goals. Are you dealing with any injuries or health issues, or starting fresh?
>
> **User**: I have knee pain from an old injury
>
> **AI**: Got it. I'll factor that into your fitness plan. On the money side — are you looking to pay off debt, build savings, or invest for the future?
>
> **User**: Pay off debt first, then save
>
> **AI**: Great plan — become debt-free first, then build your wealth. Here's your profile! ✨
>
> *[Shows profile card: Health & Fitness ✓, Financial Freedom ✓, Knee Recovery ✓, Goals: Debt free → Save → Invest]*

