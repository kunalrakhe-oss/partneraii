

## Add Language Selection to Setup Screen

### Approach
Add a new **first step** ("language") to the setup flow where users pick English or Hindi. The chosen language is saved via `useLanguage()` and persists as the primary language. All subsequent setup steps render using the `t()` function from `LanguageContext`.

### Changes

**1. `src/pages/PostAuthSetup.tsx`**
- Import `useLanguage` and `LANGUAGE_OPTIONS` 
- Add a new step type `"language"` before `"mode"`
- New "language" step UI: two large buttons (English / हिन्दी) styled like the existing mode cards, with a flag or globe icon
- On selection, call `setLanguage(lang)` which persists to localStorage and sets `document.documentElement.lang`
- All hardcoded strings in the setup steps replaced with `t("setup.xxx")` calls

**2. `src/lib/translations/en.ts`**
- Add a `setup` section with all setup screen strings:
  - `setup.chooseLang` — "Choose your language"
  - `setup.howUse` — "How will you use PartnerAI?"
  - `setup.meMode` / `setup.weMode` — mode labels and descriptions
  - `setup.whatsName` — "What's your name?"
  - `setup.priorities` — "What matters most to you?"
  - `setup.morning` — "What's your morning like?"
  - `setup.goals` — "What do you want to achieve?"
  - Priority labels, morning option labels, goal suggestions, button text

**3. `src/lib/translations/hi.ts`**
- Add matching Hindi `setup` section with all translated strings

**4. `src/pages/PostAuthSetup.tsx` — save language to profile**
- In `handleFinish`, also save the selected language to `user_preferences` so it can be restored on future logins

### Flow
```text
Language → Mode → Name → Priorities → Morning → Goals → Done
```

The language can be changed later in Profile/Settings (already supported via `LanguageContext`).

