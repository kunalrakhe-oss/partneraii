import { useSubscriptionContext, type SubscriptionTier } from "@/contexts/SubscriptionContext";
import { Lock, Crown, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface FeatureGateProps {
  feature: string;
  featureName?: string;
  children: ReactNode;
}

const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: "Free",
  pro: "Pro",
  premium: "Premium",
};

// Feature to required tier
const FEATURE_REQUIRED: Record<string, SubscriptionTier> = {
  "unlimited-calendar": "pro",
  "unlimited-chores": "pro",
  "chat-images": "pro",
  "mood-ai-tips": "pro",
  "memories": "pro",
  "daily-insight": "pro",
  "lovebot": "premium",
  "workout": "premium",
  "diet": "premium",
  "ai-chore-steps": "premium",
  "voice-assistant": "premium",
};

export default function FeatureGate({ feature, featureName, children }: FeatureGateProps) {
  const { canAccess, loading } = useSubscriptionContext();
  const navigate = useNavigate();

  if (loading) return <>{children}</>;
  if (canAccess(feature)) return <>{children}</>;

  const requiredTier = FEATURE_REQUIRED[feature] || "pro";
  const isPremium = requiredTier === "premium";

  return (
    <div className="relative min-h-[60vh]">
      {/* Blurred content preview */}
      <div className="pointer-events-none select-none blur-sm opacity-40">
        {children}
      </div>

      {/* Upgrade overlay */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute inset-0 flex items-center justify-center z-10"
      >
        <div className="bg-card border border-border rounded-3xl shadow-lg p-8 max-w-sm mx-4 text-center">
          <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
            isPremium ? "bg-gradient-to-br from-amber-400 to-orange-500" : "love-gradient"
          }`}>
            {isPremium ? (
              <Crown size={28} className="text-primary-foreground" />
            ) : (
              <Sparkles size={28} className="text-primary-foreground" />
            )}
          </div>

          <h3 className="text-lg font-bold text-foreground mb-1">
            {featureName || "This feature"} is {TIER_LABELS[requiredTier]}
          </h3>
          <p className="text-sm text-muted-foreground mb-5">
            Upgrade to {TIER_LABELS[requiredTier]} to unlock {featureName?.toLowerCase() || "this feature"} and more.
          </p>

          <button
            onClick={() => navigate("/upgrade")}
            className={`w-full py-3 rounded-xl font-semibold text-sm text-primary-foreground transition-transform active:scale-[0.97] ${
              isPremium
                ? "bg-gradient-to-r from-amber-400 to-orange-500"
                : "love-gradient"
            }`}
          >
            <Lock size={14} className="inline mr-1.5 -mt-0.5" />
            Upgrade to {TIER_LABELS[requiredTier]}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
