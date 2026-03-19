

## Plan: Week View as Default Calendar with Date-Select List View

### Overview
Replace the current default "day" view with a new "week" view that shows a horizontal week strip (7 days) at the top. Tapping a date shows that day's events in a scrollable list below. The week strip is swipeable/navigable to previous and future weeks.

### Changes

**1. Add "week" view mode to CalendarPage (`src/pages/CalendarPage.tsx`)**

- Add `"week"` to the `ViewMode` type: `type ViewMode = "day" | "week" | "multiday" | "month";`
- Change default state: `useState<ViewMode>("week")`
- Add "Week" option to the `viewIcons` array with the `CalendarDays` icon
- Update `navigatePrev`/`navigateNext` to shift by 7 days when in week mode
- Update header title to show week range (e.g., "Mar 15 - 21, 2026") in week mode

**2. Create `WeekView` component (inline in CalendarPage)**

- Renders a horizontal row of 7 days (Mon-Sun) starting from `startOfWeek(currentDate)`
- Each day shows: day name abbreviation, date number, and colored dots for events on that day
- Today is highlighted, selected date has a primary circle indicator
- Tapping a day selects it and shows that day's events in a list below
- Navigation arrows or swipe gesture to move to previous/next week

**3. Week view event list (below the week strip)**

- Shows all events for the selected date, sorted by time
- Same event card style as the existing day view (color bar, title, time, category, completion toggle)
- If no events, show the empty state with "No events" + "Tap + to add one"
- Below selected day events, show "Upcoming Events" section (events after selected date) - same as current day view
- The entire list is scrollable vertically for browsing through content

**4. Update view picker dropdown**

- Add "Week" as an option between Day and 3-Day in the dropdown menu
- Remove or keep other views as-is

### Technical Details

- The week strip uses `startOfWeek(currentDate, { weekStartsOn: 1 })` for Monday start, consistent with the month view
- `eachDayOfInterval` generates the 7 days for the strip
- Prev/next navigation shifts `currentDate` by 7 days and preserves `selectedDate` if still in range, otherwise snaps to first day of new week
- Reuses the existing event card rendering from the day view for consistency

