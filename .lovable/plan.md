

## Plan: Fix Chat Navigation from Mood Check-in + Hide Partner Tab in Me Mode

### Problems
1. **ChatPage defaults to "partner" tab** — even when navigating with `?tab=ai`, since ChatPage never reads the URL query param
2. **Partner chat tab is visible in Me Mode** — should be hidden entirely when `appMode === "single"`
3. **"Chat with AI" from mood check-in should pass mood context** — so the AI can continue the conversation about the user's mood

### Changes

**1. ChatPage: Read `?tab=ai` from URL and default to AI tab (`src/pages/ChatPage.tsx`)**
- Import `useSearchParams` from react-router-dom
- On mount, check if `tab=ai` query param exists; if so, set `activeTab` to `"ai"` instead of `"partner"`
- Also check for a `mood` query param to seed an initial AI message about the user's mood

**2. ChatPage: Hide partner tab in Me Mode (`src/pages/ChatPage.tsx`)**
- Import `useAppMode` hook
- When `isSingle` is true:
  - Force `activeTab` to `"ai"` (no partner tab available)
  - Hide the tab switcher entirely, or show only "AI" tab
  - Show just "Chat" title + AI chat view without the partner/AI toggle

**3. HomePage: Pass mood context when navigating to AI chat (`src/pages/HomePage.tsx`)**
- Change the "Chat with AI" button navigation from `/chat?tab=ai` to `/chat?tab=ai&mood={myMood.mood}&note={myMood.note}`
- This allows the AI chatbot to pick up the mood context

**4. AIChatbot: Auto-send mood context message (`src/components/AIChatbot.tsx`)**
- Accept an optional `initialContext` prop
- On mount, if `initialContext` is provided and no messages exist yet, auto-send it as a user message (or inject it as a system-level prompt to the AI so it responds contextually about the mood)

### Technical Details
- ChatPage will use `useSearchParams` to read `tab` and `mood` params
- In Me Mode, `activeTab` is locked to `"ai"` with no partner tab rendered
- The mood context passed via URL will be formatted as a natural prompt like "I'm feeling {mood} today. {note}" and sent to the AI chatbot to continue the conversation

