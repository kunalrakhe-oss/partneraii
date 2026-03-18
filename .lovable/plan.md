

# Fix: Move Sign Out to Top of Profile Drawer + Make Scrollable

## Problem
The sign-out button is at the bottom of the drawer and unreachable because the drawer isn't scrolling properly on smaller viewports.

## Changes

### `src/components/ProfileDrawer.tsx`
1. **Move Sign Out button into the header area** — place it right below the user info section (inside the header `div`, after the avatar/name block), so it's always visible without scrolling.
2. **Keep the nav items section scrollable** with `overflow-y-auto` and add `min-h-0` to ensure flex overflow works correctly.
3. **Remove the footer section entirely** since sign-out moves to the top.

The sign-out button will be styled as a compact row with the red LogOut icon + "Sign Out" text, sitting just below the user's name/email in the header area — always visible when the drawer opens.

