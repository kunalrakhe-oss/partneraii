

## Plan: Reorder Home Screen Widgets

### What Changes

Reorder the home screen so widgets render in this fixed sequence regardless of `visibleWidgets` order:

1. **Header** (greeting + avatars + bell) — stays as-is
2. **Onboarding card** — stays as-is (dismissible)
3. **Mood Check-in** — moved to top of widget area
4. **Today's Agenda / Next Event** — immediately after mood
5. **Active Plan cards** (recovery + diet) — after events
6. **Feature Bubbles** (4 categories) — middle
7. **Urgent Chores** — below categories
8. **AI Insight** — bottom

### File to Change

| File | Change |
|------|--------|
| `src/pages/HomePage.tsx` | Move the `visibleWidgets.map()` switch rendering into a fixed-order sequence. Instead of iterating `visibleWidgets` in stored order, render each widget in the desired order with `showWidget()` guards. Move Active Plan cards (recovery + diet) inside the widget flow instead of before it. |
| `src/hooks/useLayoutPreferences.ts` | Update `DEFAULT_WIDGETS` order to: `["mood-check", "next-event", "quick-links", "urgent-chores", "ai-insight"]` |

### Implementation Details

Replace the `visibleWidgets.map(widgetId => { switch... })` block (lines 473-700) with explicit ordered rendering:

```text
{showWidget("mood-check") && <MoodCheckWidget />}
{showWidget("next-event") && <NextEventWidget />}
{activePlan && <ActivePlanCard />}      ← moved from lines 417-470
{activeDietPlan && <ActiveDietCard />}
{showWidget("quick-links") && <FeatureBubbles />}
{showWidget("urgent-chores") && <UrgentChoresWidget />}
{showWidget("ai-insight") && <AIInsightWidget />}
```

Each widget block stays identical in content — only the render order changes. The Active Plan cards move from above the widget loop to inside the sequence between next-event and quick-links.

