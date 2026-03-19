

## Apple Glass (Vision Pro) Design System Overhaul

Transform the entire app's look and feel to match Apple's glassmorphism aesthetic — frosted translucent surfaces, luminous depth, subtle light refractions, and the ethereal floating-panel look from visionOS.

### Design Principles
- **Frosted glass everywhere**: Cards, nav, dialogs, sheets all use translucent backgrounds with heavy backdrop blur
- **Luminous borders**: Replace solid borders with subtle white/light glow borders
- **Depth through shadows**: Multi-layered soft shadows that simulate floating panels in space
- **Muted, ethereal palette**: Slightly cooler, more translucent base colors
- **Smooth radius**: Larger border-radius (20-24px) for that visionOS floating window feel
- **Subtle inner glow**: Light inner highlights on glass surfaces

### File Changes

| File | Change |
|------|--------|
| `src/index.css` | Overhaul CSS variables for both light/dark themes — translucent card/popover backgrounds, luminous border colors, stronger glass gradients, deeper blur values, visionOS-style shadow system with outer glow + inner highlight |
| `tailwind.config.ts` | Increase default `--radius` to 1.25rem, add `glass` border-radius (24px), add new `glass-surface` and `glass-panel` utility references |
| `src/components/ui/card.tsx` | Replace solid bg-card with glass morphism — `backdrop-blur-2xl bg-white/60 dark:bg-white/[0.06]` with luminous border |
| `src/components/ui/button.tsx` | Add glass variant, make outline/ghost variants use glass backgrounds, add subtle backdrop-blur to default variant |
| `src/components/ui/dialog.tsx` | Glass overlay (blur behind), glass content panel with frosted background |
| `src/components/ui/sheet.tsx` | Frosted glass background on sheet content panels |
| `src/components/ui/input.tsx` | Translucent input backgrounds with inner glow on focus |
| `src/components/ui/badge.tsx` | Glass pill badges with translucent backgrounds |
| `src/components/AppLayout.tsx` | Enhanced bottom nav glass effect — stronger blur, luminous top border, floating pill shape with margin |

### CSS Variable Changes (Light Theme)
- `--card`: becomes semi-transparent (`rgba(255,255,255,0.6)`) instead of opaque white
- `--border`: luminous white edge (`rgba(255,255,255,0.3)`)
- New `--glass-bg`, `--glass-border`, `--glass-blur` variables
- Shadows gain outer glow component for floating feel
- Background gets a subtle mesh gradient for depth

### CSS Variable Changes (Dark Theme)  
- `--card`: `rgba(255,255,255,0.05)` — barely-there frost
- `--border`: `rgba(255,255,255,0.08)` — soft luminous edge
- Shadows shift to subtle colored glows instead of dark drops
- Background uses deep navy/charcoal with subtle radial gradient

### New Utilities
- `.glass-surface` — standard frosted panel (blur-2xl, translucent bg, luminous border)
- `.glass-panel` — elevated frosted panel (blur-3xl, stronger opacity, glow shadow)
- `.glass-input` — translucent input field style
- `.glow-border` — animated subtle border glow effect
- Enhanced `.glass-card` with stronger Vision Pro-accurate blur and saturation values

### Key Visual Details
- Nav bar becomes a floating frosted pill with 16px margin from edges and bottom
- Cards float with multi-layer shadows (dark outer + colored glow)
- Inputs get frosted glass background with soft inner shadow
- Dialog/sheet overlays use backdrop-blur instead of plain black opacity
- All interactive elements get a subtle glass shimmer on hover

