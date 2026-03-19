

## Plan: Tap-to-Add Water Intake (250ml per tap)

Replace the water intake number input with an interactive tap-based widget where each tap adds 250ml (displayed as glasses where 1 glass = 250ml).

### What changes

**File: `src/pages/HealthPage.tsx`**

1. **Remove water from the generic `metricFields` grid** — filter out the `water_glasses` key so it no longer renders as a plain number input.

2. **Add a dedicated Water Intake card below the metrics grid** with:
   - A row of 8 droplet icons (representing a 2L daily goal)
   - Filled/highlighted droplets for each glass already logged
   - Tapping anywhere on the card adds +1 glass (250ml)
   - Display: `{count} × 250ml = {total}ml` and a progress bar toward the 2L goal
   - A minus button to undo a tap
   - The card updates `form.water_glasses` in state so it saves with the existing "Save Today" button

3. **Visual design**: Cyan-colored filled droplets, muted empty ones, subtle scale animation on tap using framer-motion.

### Layout (Log tab)
```text
┌─────────────────────────────┐
│  [Steps] [HR]  [Sleep]      │  ← 2×3 grid (water removed)
│  [Cals]  [Weight]           │
├─────────────────────────────┤
│  💧 Water Intake             │
│  🔵🔵🔵🔵⚪⚪⚪⚪  [-] [+]  │  ← tap droplets or + button
│  4 × 250ml = 1000ml         │
│  ████████░░░░  50% of 2L    │
└─────────────────────────────┘
│  [Notes input]              │
│  [Save Today button]        │
```

No database or backend changes needed — `water_glasses` field already exists and the save logic remains the same.

