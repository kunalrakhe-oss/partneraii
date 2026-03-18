import { createContext, useContext, type ReactNode } from "react";
import { useSubscription, type SubscriptionState, type SubscriptionTier, canAccessFeature } from "@/hooks/useSubscription";

interface SubscriptionContextType extends SubscriptionState {
  canAccess: (feature: string) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  tier: "free",
  subscribed: false,
  subscriptionEnd: null,
  loading: true,
  refreshSubscription: async () => {},
  canAccess: () => true,
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const sub = useSubscription();

  const canAccess = (feature: string) => canAccessFeature(sub.tier, feature);

  return (
    <SubscriptionContext.Provider value={{ ...sub, canAccess }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscriptionContext = () => useContext(SubscriptionContext);
export type { SubscriptionTier };
