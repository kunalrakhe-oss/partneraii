

## Plan: Full Hindi Translation with Language Switcher

### Approach
Create an i18n (internationalization) system using a lightweight context-based approach — no heavy library needed since the app has a manageable number of pages.

### Architecture

```text
src/
  contexts/LanguageContext.tsx    ← new: provider + useLanguage hook
  lib/translations/
    en.ts                        ← English strings
    hi.ts                        ← Hindi strings
    index.ts                     ← type definitions + helper
```

**LanguageContext** will:
- Store language preference (`en` | `hi`) in localStorage
- Provide a `t(key)` translation function and `language` / `setLanguage` values
- Wrap the app in `App.tsx`

### Translation Coverage
All user-facing strings across every page and component will be extracted into translation files:
- **Navigation**: Home, Calendar, Lists, Chat, Chores
- **Pages**: Auth, Onboarding, Profile, Home, Calendar, Chores, Grocery, Chat, Mood, Memories, Workout, Diet, Upgrade, Partner Connect, Couple Profile
- **Components**: Modals, toasts, feature gates, install prompts, voice assistant, AI chatbot
- **Edge function prompts**: AI system prompts will receive the user's language preference so responses come back in Hindi when selected

### Language Switcher
- Add a **Language** option in the Profile page settings (under Appearance/Theme section)
- Simple toggle: English ↔ हिन्दी
- Persisted in localStorage, applied immediately

### Implementation Steps
1. Create `src/lib/translations/en.ts`, `hi.ts`, and `index.ts` with all UI strings organized by page/component
2. Create `src/contexts/LanguageContext.tsx` with provider, `useLanguage` hook, and `t()` function
3. Wrap app with `LanguageProvider` in `App.tsx`
4. Update all pages and components to use `t()` instead of hardcoded English strings
5. Add language switcher to Profile page
6. Pass language to edge functions so AI responses come in the selected language
7. Update `AppLayout.tsx` nav labels to use translations

### Hindi Translation Samples
| English | Hindi |
|---------|-------|
| Home | होम |
| Calendar | कैलेंडर |
| Chores | काम |
| Chat | चैट |
| Profile | प्रोफ़ाइल |
| Upgrade to Pro | प्रो में अपग्रेड करें |
| Add Event | इवेंट जोड़ें |

