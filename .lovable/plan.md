

# Payment Integration & Feature Gating Plan

## Recommended Tier Structure

Based on your app's features, here's a suggested split:

```text
┌─────────────────────────────────────────────────┐
│  FREE                                           │
│  - Calendar (up to 10 events)                   │
│  - Grocery/Lists                                │
│  - Chores (up to 5 active)                      │
│  - Partner Chat (text only)                     │
│  - Mood logging (no AI tips)                    │
│  - Partner Connect                              │
├─────────────────────────────────────────────────┤
│  PRO  (~$4.99/month or $39.99/year)             │
│  - Unlimited calendar events                    │
│  - Unlimited chores                             │
│  - Chat with image/photo sharing                │
│  - Mood logging WITH AI tips                    │
│  - Memories (photo albums)                      │
│  - Daily AI Insight on Home                     │
├─────────────────────────────────────────────────┤
│  PREMIUM  (~$9.99/month or $79.99/year)         │
│  - Everything in Pro                            │
│  - LoveBot AI chatbot (unlimited)               │
│  - Workout tracking                             │
│  - Diet tracking                                │
│  - AI chore steps                               │
│  - Voice assistant                              │
│  - Priority support                             │
└─────────────────────────────────────────────────┘
```

## Implementation Overview

### 1. Enable Stripe Integration
Use Lovable's built-in Stripe integration to create products, prices, and handle checkout. This handles tax, webhooks, and subscription lifecycle automatically.

### 2. Database Changes
- Add a `subscriptions` table to track user subscription status (user_id, stripe_customer_id, plan tier, status, current_period_end)
- Add RLS policies so users can only read their own subscription
- Create a `get_user_tier()` database function that returns the user's current tier ('free', 'pro', 'premium') for use in RLS and app logic

### 3. Backend (Edge Functions)
- **Checkout endpoint** — creates a Stripe checkout session for a selected plan
- **Webhook endpoint** — receives Stripe events (subscription created, updated, canceled, payment failed) and updates the `subscriptions` table
- **Customer portal endpoint** — lets users manage billing via Stripe's hosted portal

### 4. Frontend Changes
- **Pricing/Upgrade page** — shows the 3 tiers with feature comparison, checkout buttons
- **Subscription context/hook** — `useSubscription()` hook that fetches user's current tier and exposes it app-wide
- **Feature gates** — wrap premium features with tier checks:
  - Show lock icon + "Upgrade to Pro" prompt when free users try to access gated features
  - Graceful degradation (e.g., free users see Memories page but get an upgrade prompt)
- **Profile page** — show current plan, "Manage Subscription" button linking to Stripe portal
- **Settings/billing section** — plan details, upgrade/downgrade options

### 5. Feature Gating Strategy
Rather than blocking navigation entirely, each gated page/component checks the tier and shows an upgrade prompt overlay. This lets users discover premium features and encourages conversion.

## Technical Details

### Subscription table schema
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### useSubscription hook pattern
```typescript
// Returns { tier: 'free' | 'pro' | 'premium', loading, canAccess(feature) }
```

### Gate component pattern
```tsx
<FeatureGate requiredTier="pro" featureName="Memories">
  <MemoriesContent />
</FeatureGate>
```

## Implementation Order
1. Enable Stripe via Lovable's built-in tool
2. Create `subscriptions` table with RLS
3. Build checkout + webhook edge functions
4. Create `useSubscription` hook + `FeatureGate` component
5. Add pricing page with tier cards
6. Wire up feature gates across pages
7. Add billing management in Profile

