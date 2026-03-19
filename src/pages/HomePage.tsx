import { Bell } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { useDemo } from "@/contexts/DemoContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { DEMO_STATS, DEMO_PARTNER1, DEMO_CHORES, DEMO_AI_INSIGHT } from "@/lib/demoData";
import PageTransition from "@/components/PageTransition";
import ProfileButton from "@/components/ProfileButton";
import NotificationsPanel, { useNotificationCount } from "@/components/NotificationsPanel";
import AICoachStrip from "@/components/home/AICoachStrip";
import TodayFocusRing from "@/components/home/TodayFocusRing";
import PillarGrid from "@/components/home/PillarGrid";
import QuickGlanceScroll from "@/components/home/QuickGlanceScroll";
import ActivePlansStrip from "@/components/home/ActivePlansStrip";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

type NextEvent = { title: string; event_date: string };
type ActivePlan = { id?: string; plan_type: string; title: string; started_at: string };

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canAccess } = useSubscriptionContext();
  const { partnerPair } = usePartnerPair();
  const { isDemoMode } = useDemo();
  const { t } = useLanguage();
  const unreadCount = useNotificationCount();

  const [firstName, setFirstName] = useState("");
  const [appMode, setAppMode] = useState("couple");
  const [showNotifications, setShowNotifications] = useState(false);

  // Stats
  const [nextEvent, setNextEvent] = useState<NextEvent | null>(null);
  const [pendingChores, setPendingChores] = useState(0);
  const [uncheckedGroceries, setUncheckedGroceries] = useState(0);
  const [daysTogether, setDaysTogether] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);

  // Plans & preferences
  const [activePlans, setActivePlans] = useState<ActivePlan[]>([]);
  const [dailyGoals, setDailyGoals] = useState<string[]>([]);

  // AI Insight
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const isSingle = appMode === "single";
  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, created_at, app_mode")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const raw = data?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "there";
        setFirstName(raw.split(" ")[0]);
        setAppMode(data?.app_mode || "couple");
        if (data?.created_at) {
          setDaysTogether(Math.max(1, Math.floor((Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60 * 24))));
        }
      });
  }, [user]);

  // Fetch preferences
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_preferences")
      .select("daily_goals")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.daily_goals) setDailyGoals(data.daily_goals);
      });
  }, [user]);

  // Fetch active plans
  useEffect(() => {
    if (!user) return;
    const plans: ActivePlan[] = [];
    Promise.all([
      supabase.from("recovery_plans").select("id, plan_type, title, started_at").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("diet_plans").select("id, title, goal, started_at").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]).then(([rec, diet]) => {
      if (rec.data) plans.push({ id: rec.data.id, plan_type: rec.data.plan_type, title: rec.data.title, started_at: rec.data.started_at });
      if (diet.data) plans.push({ id: diet.data.id, plan_type: "diet", title: diet.data.title, started_at: diet.data.started_at });
      setActivePlans(plans);
    });
  }, [user]);

  // Fetch stats
  useEffect(() => {
    if (!partnerPair || !user) return;

    supabase.from("calendar_events").select("title, event_date").eq("partner_pair", partnerPair).eq("is_completed", false).gt("event_date", today).order("event_date").limit(1).maybeSingle()
      .then(({ data }) => setNextEvent(data || null));

    supabase.from("chores").select("id", { count: "exact", head: true }).eq("partner_pair", partnerPair).eq("is_completed", false)
      .then(({ count }) => setPendingChores(count ?? 0));

    supabase.from("grocery_items").select("id", { count: "exact", head: true }).eq("partner_pair", partnerPair).eq("is_checked", false)
      .then(({ count }) => setUncheckedGroceries(count ?? 0));

    supabase.from("calendar_events").select("id", { count: "exact", head: true }).eq("partner_pair", partnerPair)
      .then(({ count }) => setTotalEvents(count ?? 0));
  }, [partnerPair, user, today]);

  // AI Insight
  const fetchInsight = useCallback(async () => {
    if (insightLoading) return;
    setInsightLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-insight", {
        body: {
          language: localStorage.getItem("lovelist-language") || "en",
          stats: { daysTogether, pendingChores, groceryItems: uncheckedGroceries, todayEvents: 0 },
        },
      });
      if (error) throw error;
      if (data?.insight) setAiInsight(data.insight);
    } catch {
      setAiInsight("Keep building your best life! 💕");
    } finally {
      setInsightLoading(false);
    }
  }, [daysTogether, pendingChores, uncheckedGroceries]);

  useEffect(() => {
    if (isDemoMode && !aiInsight) { setAiInsight(DEMO_AI_INSIGHT); return; }
    if (canAccess("daily-insight") && partnerPair && !aiInsight && !insightLoading && daysTogether > 0) fetchInsight();
  }, [partnerPair, daysTogether, fetchInsight, aiInsight, insightLoading, isDemoMode]);

  // Demo fallbacks
  useEffect(() => {
    if (!isDemoMode) return;
    if (daysTogether === 0) setDaysTogether(DEMO_STATS.daysTogether);
    if (pendingChores === 0) setPendingChores(DEMO_CHORES.length);
    if (uncheckedGroceries === 0) setUncheckedGroceries(6);
    if (!firstName || firstName === "there") setFirstName(DEMO_PARTNER1);
  }, [isDemoMode]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t("greeting.morning");
    if (h < 17) return t("greeting.afternoon");
    return t("greeting.evening");
  })();

  return (
    <PageTransition>
      {/* Sticky header — outside scroll flow */}
      <div className="sticky top-0 z-20 bg-background px-5 pt-10 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ProfileButton />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {greeting}, {firstName} <span className="text-base">✨</span>
            </h1>
            <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
          </div>
        </div>
        <button onClick={() => setShowNotifications(true)} className="relative w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <Bell size={18} className="text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      <div className="px-5 pb-6">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

          {/* Today's Focus */}
          <motion.div variants={item}>
            <TodayFocusRing dailyGoals={dailyGoals} />
          </motion.div>

          {/* Life Pillars */}
          <motion.div variants={item}>
            <PillarGrid isSingle={isSingle} />
          </motion.div>

          {/* Quick Glance */}
          <motion.div variants={item}>
            <QuickGlanceScroll nextEvent={nextEvent} pendingChores={pendingChores} uncheckedGroceries={uncheckedGroceries} daysTogether={daysTogether} />
          </motion.div>

          {/* Active Plans */}
          <motion.div variants={item}>
            <ActivePlansStrip plans={activePlans} />
          </motion.div>

          {/* Daily AI Insight */}
          {aiInsight && (
            <motion.div variants={item}>
              <div className="rounded-2xl bg-card/60 backdrop-blur-glass border border-border/40 px-4 py-3 shadow-card"
                style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)", backdropFilter: "blur(40px) saturate(1.8)" }}
              >
                <p className="text-xs text-muted-foreground mb-1 font-medium">Daily Insight</p>
                <p className="text-sm text-foreground leading-relaxed">{aiInsight}</p>
              </div>
            </motion.div>
          )}

          {/* AI Coach — inline chat at bottom */}
          <motion.div variants={item}>
            <AICoachStrip greeting={greeting} firstName={firstName} />
          </motion.div>
        </motion.div>
      </div>

      {/* Notifications */}
      <NotificationsPanel open={showNotifications} onClose={() => setShowNotifications(false)} />
    </PageTransition>
  );
}
