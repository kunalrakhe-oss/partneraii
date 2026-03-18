import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Check, Crown, Sparkles, Star, ChevronLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { STRIPE_TIERS } from "@/lib/stripe";

type BillingInterval = "monthly" | "yearly";

const FREE_FEATURES = [
  "Calendar (up to 10 events)",
  "Grocery & Shopping Lists",
  "Chores (up to 5 active)",
  "Partner Chat (text only)",
  "Mood Logging",
  "Partner Connect",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited calendar events",
  "Unlimited chores",
  "Photo sharing in chat",
  "AI mood tips & insights",
  "Memories & photo albums",
  "Daily AI insight on Home",
];

const PREMIUM_FEATURES = [
  "Everything in Pro",
  "LoveBot AI chatbot",
  "Workout tracking",
  "Diet & meal tracking",
  "AI chore step breakdown",
  "Voice assistant",
  "Priority support",
];

export default function UpgradePage() {
  const navigate = useNavigate();
  const { tier, loading: subLoading } = useSubscriptionContext();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  const handleCheckout = async (planTier: "pro" | "premium") => {
    setCheckingOut(planTier);
    try {
      const priceId = STRIPE_TIERS[planTier][interval].priceId;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast({ title: "Checkout failed", description: e.message, variant: "destructive" });
    } finally {
      setCheckingOut(null);
    }
  };

  const proPrice = interval === "monthly" ? "$4.99" : "$39.99";
  const premiumPrice = interval === "monthly" ? "$9.99" : "$79.99";
  const proPerMonth = interval === "yearly" ? "$3.33" : "$4.99";
  const premiumPerMonth = interval === "yearly" ? "$6.66" : "$9.99";

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ChevronLeft size={18} className="text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground">{t("upgrade.chooseYourPlan")}</h1>
          <div className="w-9" />
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-1 mb-6">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              interval === "monthly"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {t("upgrade.monthly")}
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all relative ${
              interval === "yearly"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {t("upgrade.yearly")}
            <span className="absolute -top-2 -right-2 bg-success text-success-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {t("upgrade.save33")}
            </span>
          </button>
        </div>

        <div className="space-y-4">
          {/* Free Tier */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            className={`bg-card rounded-2xl border p-5 ${tier === "free" ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Star size={20} className="text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{t("upgrade.free")}</h3>
                <p className="text-xs text-muted-foreground">{t("upgrade.basicFeatures")}</p>
              </div>
              {tier === "free" && (
                <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{t("upgrade.currentPlan")}</span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground mb-4">$0<span className="text-xs text-muted-foreground font-normal">/{t("upgrade.forever")}</span></p>
            <ul className="space-y-2">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                  <Check size={14} className="text-success shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Pro Tier */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`bg-card rounded-2xl border p-5 relative overflow-hidden ${tier === "pro" ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
          >
            <div className="absolute top-0 right-0 love-gradient text-primary-foreground text-[9px] font-bold px-3 py-1 rounded-bl-xl">
              POPULAR
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl love-gradient flex items-center justify-center">
                <Sparkles size={20} className="text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Pro</h3>
                <p className="text-xs text-muted-foreground">For active couples</p>
              </div>
              {tier === "pro" && (
                <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">Current Plan</span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground mb-1">
              {proPrice}<span className="text-xs text-muted-foreground font-normal">/{interval === "monthly" ? "mo" : "yr"}</span>
            </p>
            {interval === "yearly" && (
              <p className="text-[10px] text-muted-foreground mb-3">That's just {proPerMonth}/month</p>
            )}
            {interval === "monthly" && <div className="mb-3" />}
            <ul className="space-y-2 mb-4">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                  <Check size={14} className="text-success shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            {tier !== "pro" && tier !== "premium" && (
              <button
                onClick={() => handleCheckout("pro")}
                disabled={!!checkingOut}
                className="w-full py-3 rounded-xl love-gradient text-primary-foreground font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checkingOut === "pro" ? <Loader2 size={16} className="animate-spin" /> : "Upgrade to Pro"}
              </button>
            )}
          </motion.div>

          {/* Premium Tier */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`bg-card rounded-2xl border p-5 relative overflow-hidden ${tier === "premium" ? "border-amber-400 ring-2 ring-amber-400/20" : "border-border"}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Crown size={20} className="text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Premium</h3>
                <p className="text-xs text-muted-foreground">The ultimate experience</p>
              </div>
              {tier === "premium" && (
                <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Current Plan</span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground mb-1">
              {premiumPrice}<span className="text-xs text-muted-foreground font-normal">/{interval === "monthly" ? "mo" : "yr"}</span>
            </p>
            {interval === "yearly" && (
              <p className="text-[10px] text-muted-foreground mb-3">That's just {premiumPerMonth}/month</p>
            )}
            {interval === "monthly" && <div className="mb-3" />}
            <ul className="space-y-2 mb-4">
              {PREMIUM_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                  <Check size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            {tier !== "premium" && (
              <button
                onClick={() => handleCheckout("premium")}
                disabled={!!checkingOut}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-primary-foreground font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checkingOut === "premium" ? <Loader2 size={16} className="animate-spin" /> : "Upgrade to Premium"}
              </button>
            )}
          </motion.div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-6">
          Cancel anytime • Secure payment via Stripe
        </p>
      </div>
    </PageTransition>
  );
}
