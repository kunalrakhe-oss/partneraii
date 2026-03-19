

## Plan: Memory Garden Timeline + Fullscreen Photo Viewer

### Two Changes

**1. Fullscreen Photo Viewer**
Add a lightbox overlay: tapping any memory photo opens it full-screen with a dark backdrop, pinch-to-zoom feel, and an X button to return. Simple `fixed inset-0 z-[70]` overlay with the image centered using `object-contain`.

**2. Memory Garden Path (Creative Timeline Redesign)**
Replace the current flat card timeline with a **winding garden vine** visual. A vertical SVG vine runs down the center of the page. Memories branch off alternating left and right like leaves/flowers on a growing plant. Each memory is a small card "attached" to the vine with a decorative node (leaf emoji for notes, flower for milestones, camera for photos).

```text
         🌱 Today
          │
    ┌─────┤
    │ Photo│
    │ card │
    └──────┤
           ├──────┐
           │ Note │
           ├──────┘
    ┌──────┤
    │Miles-│
    │tone  │
    └──────┤
          │
        🌿 March 2026
          │
           ├──────┐
           │ ...  │
           └──────┘
          │
        🌸 Start
```

- On mobile (430px), cards alternate left/right of the central vine line
- The vine is a simple 2px gradient line (green tones) with decorative dots at each branch point
- Month headers become "growth markers" with leaf/flower emojis
- Cards are smaller and more compact than current full-width cards (max ~60% width each side)
- Photos show as small thumbnails (tappable for fullscreen)
- Reactions collapse into a single row of small emoji counts

### Files to Change

| File | Change |
|------|--------|
| `src/pages/MemoriesPage.tsx` | Add fullscreen photo state + overlay. Replace the timeline section (lines 351-499) with the garden vine layout: alternating cards on a central line, compact card design, decorative vine nodes. Keep all existing logic (reactions, comments, filters, add modal) intact. |

### Implementation Details

- **Fullscreen state**: `viewingPhoto: string | null` — set on image tap, renders a fixed overlay with `object-contain` image and X close button
- **Vine line**: A `div` with `w-0.5 bg-gradient-to-b from-green-400 to-green-700` running down the center, `absolute left-1/2`
- **Alternating layout**: Even-index memories flex `flex-row`, odd-index flex `flex-row-reverse`, each card takes `w-[55%]`
- **Branch nodes**: Small circles (`w-3 h-3 rounded-full`) at the junction point with type-specific colors/emojis
- **Month markers**: Centered badges on the vine with leaf emoji and month name
- **Compact cards**: Photo thumbnail 80px tall, title + date only, reactions as tiny inline emojis. Tap card to expand comments (existing logic preserved)
- **No database changes needed**

