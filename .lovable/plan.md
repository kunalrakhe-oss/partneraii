

## Redesign Mood Form to Match Partner Reaction Card Style

The partner reaction card (lines 333-371) has a clean, polished design: rounded card with avatar, status text, emoji reaction row, and an input+send bar. The mood logging section above it (lines 266-324) is scattered -- a lone emoji trigger, a separate textarea, and a standalone button. The goal is to wrap the entire mood check-in into a single cohesive card that mirrors the partner card's structure.

### Design

The new "Your Check-in" card will follow this layout:

```text
┌─────────────────────────────────────┐
│  [Avatar+Name]  "How are you?"      │
│  Current mood: 😊 Happy             │
│                                     │
│  Tap to change:                     │
│  [😊][🤩][🥰][😌][🙏][🤪]  ...    │  ← inline emoji row (grouped)
│                                     │
│  [  What's on your mind...   ][Save]│  ← input + button bar
└─────────────────────────────────────┘
```

### Changes (single file: `src/pages/MoodPage.tsx`)

1. **Wrap mood section in a card** -- Replace the current loose emoji trigger + textarea + button (lines ~266-324) with a `bg-card rounded-2xl p-4 shadow-card border border-border` container, matching the partner card.

2. **Add user avatar header** -- Show user's initial in a circle (like the partner "P" avatar) with an online indicator dot, plus the greeting text "How are you feeling?" and current mood label.

3. **Inline emoji picker** -- Instead of a floating popover, show the mood emojis directly inside the card in grouped rows (Positive / Tough / Intense labels, same compact layout). Selected mood gets the highlighted ring treatment. Tapping logs the mood immediately (no popover dismiss needed).

4. **Compact note + save bar** -- Replace the full-width textarea and button with a single-line input + "Save" send button in a flex row, identical to the reaction message bar (`flex gap-2`, input with `bg-muted rounded-xl`, small primary button with icon).

5. **Remove** the `showMoodPicker` state, the floating picker overlay, and the standalone "Update Mood" button since the emoji selection and note saving are now inline within the card.

### Result

The mood form becomes a self-contained card that visually mirrors the partner reaction card -- same border radius, shadow, avatar pattern, inline emoji row, and input+action bar layout.

