

## Plan: Add Language Selection to Onboarding Entry Screen

### What
Add a language picker to the very first screen of the onboarding flow ("entry" step) and the auth page, so users can choose English or Hindi before proceeding.

### How

**1. OnboardingFlow.tsx — Entry step**
- Import `useLanguage` (already imported) and `LANGUAGE_OPTIONS` from translations index
- Add a small language toggle/selector near the top of the entry screen (e.g., a compact pill-style switcher showing "EN | हिन्दी") positioned at the top-right corner
- On tap, switch language via `setLanguage()` — the rest of the UI updates instantly since `t()` is already wired up

**2. AuthPage.tsx — Auth screen**
- Add the same language toggle at the top-right of the auth page
- Import `LANGUAGE_OPTIONS` and use `setLanguage` from `useLanguage`

**3. UI Design**
- A small, unobtrusive toggle button in the top-right corner showing the current language's native label (e.g., "English" / "हिन्दी")
- Tapping cycles between languages (since there are only 2), or shows a small dropdown
- Styled to match the existing design system (rounded-xl, bg-card, border-border, text-sm)

### Files to modify
- `src/pages/OnboardingFlow.tsx` — Add language switcher to entry step
- `src/pages/AuthPage.tsx` — Add language switcher to top area

