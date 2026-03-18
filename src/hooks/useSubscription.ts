import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionTier = "free" | "pro" | "premium";

export interface SubscriptionState {
  tier: SubscriptionTier;
  subscribed: boolean;
  subscriptionEnd: string | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  accessCodeActive: boolean;
  applyAccessCode: (code: string) => boolean;
  clearAccessCode: () => void;
}

const ACCESS_CODE_KEY = "lovelist-access-code";
const VALID_ACCESS_CODE = "NeeKun";
const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function isAccessCodeActive(): boolean {
  return localStorage.getItem(ACCESS_CODE_KEY) === VALID_ACCESS_CODE;
}

export function isTrialActive(userCreatedAt?: string): boolean {
  if (!userCreatedAt) return false;
  const createdTime = new Date(userCreatedAt).getTime();
  return Date.now() - createdTime < TRIAL_DURATION_MS;
}

export function getTrialDaysLeft(userCreatedAt?: string): number {
  if (!userCreatedAt) return 0;
  const createdTime = new Date(userCreatedAt).getTime();
  const remaining = TRIAL_DURATION_MS - (Date.now() - createdTime);
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

// Feature to minimum tier mapping
const FEATURE_TIERS: Record<string, SubscriptionTier> = {
  // Pro features
  "unlimited-calendar": "pro",
  "unlimited-chores": "pro",
  "chat-images": "pro",
  "mood-ai-tips": "pro",
  "memories": "pro",
  "daily-insight": "pro",
  // Premium features
  "lovebot": "premium",
  "workout": "premium",
  "diet": "premium",
  "ai-chore-steps": "premium",
  "voice-assistant": "premium",
};

const TIER_RANK: Record<SubscriptionTier, number> = { free: 0, pro: 1, premium: 2 };

export function canAccessFeature(userTier: SubscriptionTier, feature: string): boolean {
  const requiredTier = FEATURE_TIERS[feature];
  if (!requiredTier) return true; // unknown feature = allowed
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

export function useSubscription(): SubscriptionState {
  const { user, session } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessCodeActive, setAccessCodeActive] = useState(isAccessCodeActive());
  const trialActive = isTrialActive(user?.created_at);
  const trialDaysLeft = getTrialDaysLeft(user?.created_at);

  const applyAccessCode = useCallback((code: string): boolean => {
    if (code === VALID_ACCESS_CODE) {
      localStorage.setItem(ACCESS_CODE_KEY, code);
      setAccessCodeActive(true);
      setTier("premium");
      setSubscribed(true);
      return true;
    }
    return false;
  }, []);

  const clearAccessCode = useCallback(() => {
    localStorage.removeItem(ACCESS_CODE_KEY);
    setAccessCodeActive(false);
  }, []);

  const refreshSubscription = useCallback(async () => {
    // Access code overrides everything
    if (isAccessCodeActive()) {
      setTier("premium");
      setSubscribed(true);
      setSubscriptionEnd(null);
      setAccessCodeActive(true);
      setLoading(false);
      return;
    }

    if (!session?.access_token) {
      setTier("free");
      setSubscribed(false);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setTier(data?.tier || "free");
      setSubscribed(data?.subscribed || false);
      setSubscriptionEnd(data?.subscription_end || null);
    } catch (e) {
      console.error("Failed to check subscription:", e);
      setTier("free");
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  // Refresh every 60s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshSubscription, 60_000);
    return () => clearInterval(interval);
  }, [user, refreshSubscription]);

  return { tier, subscribed, subscriptionEnd, loading, refreshSubscription, accessCodeActive, applyAccessCode, clearAccessCode };
}
