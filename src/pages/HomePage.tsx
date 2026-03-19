import { Heart, ShoppingCart, MessageSquare, Check, Sparkles, Plus, Camera, CalendarDays, Clock, Image, Trophy, Loader2, RefreshCw, X, Send, Bell, Users, BookOpen, Rocket, BookHeart, Dumbbell, Apple, Baby, Shield, Activity, HeartPulse, MapPin, Wallet, PartyPopper, Flame, Brain, Target, Salad, Moon, CalendarPlus } from "lucide-react";
import FeatureBubbles from "@/components/FeatureBubbles";
import AICoachCard from "@/components/AICoachCard";
import ProfileButton from "@/components/ProfileButton";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import AddEventModal from "@/components/AddEventModal";
import { format, formatDistanceToNowStrict, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import NotificationsPanel, { useNotificationCount } from "@/components/NotificationsPanel";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_STATS, DEMO_PARTNER_MOOD, DEMO_MOOD_MESSAGE, DEMO_AI_INSIGHT, DEMO_TODAY_EVENTS, DEMO_PARTNER1, DEMO_PARTNER2, DEMO_CHORES } from "@/lib/demoData";
import { getHomeWidgets, type HomeWidgetId } from "@/hooks/useLayoutPreferences";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageFab } from "@/contexts/PageFabContext";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

type NextEvent = { id: string; title: string; event_date: string; event_time: string | null; category: string; countdown_type?: string };

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canAccess } = useSubscriptionContext();
  const { partnerPair } = usePartnerPair();
  const { isDemoMode } = useDemo();
  const { t } = useLanguage();
  const [firstName, setFirstName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [appMode, setAppMode] = useState<string>("couple");
  const [partnerProfile, setPartnerProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [partnerMood, setPartnerMood] = useState<{ mood: string; note: string | null } | null>(null);
  const [myMood, setMyMood] = useState<{ mood: string; note: string | null } | null>(null);
  const [todayEvents, setTodayEvents] = useState<{ id: string; title: string; event_time: string | null }[]>([]);
  const [urgentChores, setUrgentChores] = useState<{ id: string; title: string; is_completed: boolean; recurrence: string | null }[]>([]);
  const [uncheckedGroceries, setUncheckedGroceries] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [nextEvent, setNextEvent] = useState<NextEvent | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  usePageFab([{ label: "Add Event", icon: CalendarPlus, onTap: () => setShowAddEvent(true) }]);
  const [showMoodPopup, setShowMoodPopup] = useState(false);
  const [moodReaction, setMoodReaction] = useState("");
  const [sendingReaction, setSendingReaction] = useState(false);
  const [reactionMessage, setReactionMessage] = useState("");
  const [showMoodEmojiPicker, setShowMoodEmojiPicker] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAddChore, setShowAddChore] = useState(false);
  const [newChoreTitle, setNewChoreTitle] = useState("");
  const unreadCount = useNotificationCount();
  const [visibleWidgets, setVisibleWidgets] = useState<HomeWidgetId[]>(getHomeWidgets);
  const [activePlan, setActivePlan] = useState<{ id?: string; plan_type: string; title: string; started_at: string } | null>(null);
  const [activeDietPlan, setActiveDietPlan] = useState<{ id?: string; title: string; goal: string; started_at: string } | null>(null);
  const [userPreferences, setUserPreferences] = useState<{ priorities: string[]; morning_routine: string | null; life_goals: string[]; daily_goals: string[] } | null>(null);
  useEffect(() => {
    const onUpdate = () => setVisibleWidgets(getHomeWidgets());
    window.addEventListener("layout-prefs-changed", onUpdate);
    return () => window.removeEventListener("layout-prefs-changed", onUpdate);
  }, []);

  const showWidget = (id: HomeWidgetId) => visibleWidgets.includes(id);

  // Analytics
  const [daysTogether, setDaysTogether] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalMemories, setTotalMemories] = useState(0);
  const [completedChores, setCompletedChores] = useState(0);
  const [pendingChores, setPendingChores] = useState(0);

  // AI Insight
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [insightDismissed, setInsightDismissed] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);

  // AI Mood Check-in
  const [aiMoodCheckin, setAiMoodCheckin] = useState<string | null>(null);
  const [aiMoodLoading, setAiMoodLoading] = useState(false);

  const isSingle = appMode === "single";

  // Fetch AI mood check-in when myMood changes
  useEffect(() => {
    if (!myMood?.mood) { setAiMoodCheckin(null); return; }
    const fetchMoodCheckin = async () => {
      setAiMoodLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("mood-tip", {
          body: {
            myMood: myMood.mood,
            partnerMood: isSingle ? null : partnerMood?.mood || null,
            weekHistory: "",
            language: localStorage.getItem("lovelist-language") || "en",
          },
        });
        if (error) throw error;
        if (data?.tip) setAiMoodCheckin(data.tip);
      } catch {
        setAiMoodCheckin("Take a moment to check in with yourself today! 💕");
      } finally {
        setAiMoodLoading(false);
      }
    };
    fetchMoodCheckin();
  }, [myMood?.mood, isSingle, partnerMood?.mood]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url, created_at, partner_id, app_mode").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        const raw = data?.display_name || user.user_metadata?.full_name || user.user_metadata?.display_name || user.user_metadata?.name || user.email?.split("@")[0] || "there";
        setFirstName(raw.split(" ")[0]);
        setAvatarUrl(data?.avatar_url || user.user_metadata?.avatar_url || null);
        setAppMode((data as any)?.app_mode || "couple");
        if (data?.created_at) {
          const created = new Date(data.created_at);
          const diff = Math.max(1, Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)));
          setDaysTogether(diff);
        }
        // Fetch partner profile if connected
        if (data?.partner_id) {
          supabase.from("profiles").select("display_name, avatar_url").eq("id", data.partner_id).maybeSingle()
            .then(({ data: partner }) => {
              if (partner) setPartnerProfile(partner);
            });
        }
      });
  }, [user]);

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!partnerPair || !user) return;

    // Partner mood
    const fetchPartnerMood = () => {
      supabase.from("mood_logs").select("mood, note, user_id").eq("partner_pair", partnerPair).eq("log_date", today)
        .then(({ data }) => {
          if (data) {
            const partner = data.find(l => l.user_id !== user.id);
            const mine = data.find(l => l.user_id === user.id);
            setPartnerMood(partner ? { mood: partner.mood, note: partner.note } : null);
            setMyMood(mine ? { mood: mine.mood, note: mine.note } : null);
          }
        });
    };
    fetchPartnerMood();

    // Subscribe to realtime mood changes
    const moodChannel = supabase.channel("home-mood-" + partnerPair)
      .on("postgres_changes", { event: "*", schema: "public", table: "mood_logs", filter: `partner_pair=eq.${partnerPair}` },
        () => { fetchPartnerMood(); })
      .subscribe();

    // Today's events
    supabase.from("calendar_events").select("id, title, event_time").eq("partner_pair", partnerPair).eq("event_date", today).eq("is_completed", false)
      .then(({ data }) => { if (data) setTodayEvents(data); });

    // Next upcoming event
    supabase.from("calendar_events")
      .select("id, title, event_date, event_time, category, countdown_type")
      .eq("partner_pair", partnerPair)
      .eq("is_completed", false)
      .gt("event_date", today)
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { setNextEvent(data || null); });

    // Chores
    supabase.from("chores").select("id, title, is_completed, recurrence").eq("partner_pair", partnerPair).eq("is_completed", false).limit(3)
      .then(({ data }) => { if (data) { setUrgentChores(data); setPendingChores(data.length); } });

    // Grocery count
    supabase.from("grocery_items").select("id", { count: "exact", head: true }).eq("partner_pair", partnerPair).eq("is_checked", false)
      .then(({ count }) => { setUncheckedGroceries(count ?? 0); });

    // Message count
    supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("partner_pair", partnerPair)
      .then(({ count }) => { setMessageCount(count ?? 0); });

    // Analytics
    supabase.from("calendar_events").select("id", { count: "exact", head: true }).eq("partner_pair", partnerPair)
      .then(({ count }) => { setTotalEvents(count ?? 0); });

    supabase.from("memories").select("id", { count: "exact", head: true }).eq("partner_pair", partnerPair)
      .then(({ count }) => { setTotalMemories(count ?? 0); });

    supabase.from("chores").select("id", { count: "exact", head: true }).eq("partner_pair", partnerPair).eq("is_completed", true)
      .then(({ count }) => { setCompletedChores(count ?? 0); });

    return () => { supabase.removeChannel(moodChannel); };
  }, [partnerPair, user, today]);

  // Fetch active recovery plan & diet plan (with IDs for AI Coach modification)
  useEffect(() => {
    if (!user) return;
    supabase
      .from("recovery_plans")
      .select("id, plan_type, title, started_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setActivePlan(data as any);
      });

    supabase
      .from("diet_plans")
      .select("id, title, goal, started_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setActiveDietPlan(data as any);
      });
  }, [user]);

  // Fetch user preferences
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_preferences")
      .select("priorities, morning_routine, daily_goals, life_goals")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setUserPreferences(data as any);
      });
  }, [user]);

  // Fetch AI insight
  const fetchInsight = useCallback(async () => {
    if (insightLoading) return;
    setInsightLoading(true);
    try {
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
      const dailyIntent = sessionStorage.getItem("partnerai-daily-intent") || null;

      const { data, error } = await supabase.functions.invoke("daily-insight", {
        body: {
          language: localStorage.getItem("lovelist-language") || "en",
          preferences: userPreferences ? {
            priorities: userPreferences.priorities,
            morning_routine: userPreferences.morning_routine,
            daily_intent: dailyIntent,
          } : undefined,
          stats: {
            daysTogether,
            pendingChores,
            completedChores,
            groceryItems: uncheckedGroceries,
            todayEvents: todayEvents.length,
            totalMemories,
            messageCount,
            partnerMood: partnerMood?.mood || null,
            timeOfDay,
          },
        },
      });
      if (error) throw error;
      if (data?.insight) setAiInsight(data.insight);
    } catch (e) {
      console.error("Insight error:", e);
      setAiInsight("Keep building your best life! 💕");
    } finally {
      setInsightLoading(false);
    }
  }, [daysTogether, pendingChores, completedChores, uncheckedGroceries, todayEvents.length, totalMemories, messageCount, partnerMood, userPreferences]);

  // Auto-fetch insight once data is loaded
  useEffect(() => {
    if (isDemoMode && !aiInsight) {
      setAiInsight(DEMO_AI_INSIGHT);
      return;
    }
    if (canAccess("daily-insight") && partnerPair && !aiInsight && !insightLoading && daysTogether > 0) {
      fetchInsight();
    }
  }, [partnerPair, daysTogether, fetchInsight, aiInsight, insightLoading, isDemoMode]);

  // Apply demo data when in demo mode and no real data
  useEffect(() => {
    if (!isDemoMode) return;
    if (daysTogether === 0) setDaysTogether(DEMO_STATS.daysTogether);
    if (totalEvents === 0) setTotalEvents(DEMO_STATS.totalEvents);
    if (totalMemories === 0) setTotalMemories(DEMO_STATS.totalMemories);
    if (completedChores === 0) setCompletedChores(DEMO_STATS.completedChores);
    if (!partnerMood) setPartnerMood(DEMO_PARTNER_MOOD);
    if (todayEvents.length === 0) setTodayEvents(DEMO_TODAY_EVENTS as any);
    if (urgentChores.length === 0) setUrgentChores(DEMO_CHORES.map(c => ({ id: c.id, title: c.title, is_completed: c.is_completed, recurrence: c.recurrence })));
    if (uncheckedGroceries === 0) setUncheckedGroceries(6);
    if (messageCount === 0) setMessageCount(3);
    if (!firstName || firstName === "there") setFirstName(DEMO_PARTNER1);
  }, [isDemoMode]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("greeting.morning");
    if (hour < 17) return t("greeting.afternoon");
    return t("greeting.evening");
  })();

  const toggleChore = async (id: string) => {
    const chore = urgentChores.find(c => c.id === id);
    if (!chore) return;
    await supabase.from("chores").update({ is_completed: !chore.is_completed }).eq("id", id);
    setUrgentChores(prev => prev.map(c => c.id === id ? { ...c, is_completed: !c.is_completed } : c));
  };

  const formatEventDate = (dateStr: string) => {
    const d = parseISO(dateStr);
    if (isToday(d)) return t("common.today");
    if (isTomorrow(d)) return t("common.tomorrow");
    return format(d, "MMM d");
  };

  const getCountdownBadge = (event: NextEvent): string | null => {
    if (!event.countdown_type || event.countdown_type === "none") return null;
    const now = new Date(); now.setHours(0,0,0,0);
    const eventDay = parseISO(event.event_date); eventDay.setHours(0,0,0,0);
    const diff = Math.round((eventDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (event.countdown_type === "days-until") {
      if (diff === 0) return "🎉 Today!";
      if (diff === 1) return "Tomorrow!";
      if (diff > 0) return `${diff} days to go`;
      return `${Math.abs(diff)}d ago`;
    }
    if (event.countdown_type === "days-since") {
      if (diff === 0) return "🎉 Today!";
      if (diff < 0) return `${Math.abs(diff)} days since`;
      return `In ${diff}d`;
    }
    return null;
  };

  return (
    <PageTransition>
      <div className="px-5 pb-6">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
          {/* Header */}
          <motion.div variants={item} className="sticky top-0 z-20 bg-background -mx-5 px-5 pt-10 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ProfileButton />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{greeting}, {firstName} <span className="text-base">✨</span></h1>
                <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Couple Avatars - only for couple mode */}
              {!isSingle && partnerProfile && !isDemoMode && (
                <button onClick={() => navigate("/couple")} className="flex -space-x-2.5 mr-1">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Me" className="w-9 h-9 rounded-full object-cover border-2 border-card z-10 ring-1 ring-primary/20" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/15 border-2 border-card z-10 flex items-center justify-center text-xs font-bold text-primary ring-1 ring-primary/20">
                      {firstName?.charAt(0) || "?"}
                    </div>
                  )}
                  {partnerProfile.avatar_url ? (
                    <img src={partnerProfile.avatar_url} alt="Partner" className="w-9 h-9 rounded-full object-cover border-2 border-card ring-1 ring-secondary/20" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-secondary/15 border-2 border-card flex items-center justify-center text-xs font-bold text-secondary ring-1 ring-secondary/20">
                      {partnerProfile.display_name?.charAt(0) || "❤️"}
                    </div>
                  )}
                </button>
              )}
              <button onClick={() => setShowNotifications(true)} className="relative w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Bell size={18} className="text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </motion.div>

          {/* AI Coach Card */}
          <motion.div variants={item}>
            <AICoachCard
              preferences={userPreferences}
              activePlans={[
                ...(activePlan ? [activePlan] : []),
                ...(activeDietPlan ? [{ plan_type: "diet", title: activeDietPlan.title, started_at: activeDietPlan.started_at }] : []),
              ]}
            />
          </motion.div>


          {/* ❤️ Make it Real - Getting Started (couple mode demo) */}
          {isDemoMode && !isSingle && !localStorage.getItem("lovelist-onboard-dismissed") && (
            <motion.div variants={item}>
              <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 rounded-2xl p-4 border border-primary/20 shadow-soft relative">
                <button
                  onClick={() => { localStorage.setItem("lovelist-onboard-dismissed", "true"); }}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center"
                >
                  <X size={12} className="text-muted-foreground" />
                </button>
                <div className="flex items-center gap-2 mb-2">
                  <Heart size={14} className="text-primary" fill="currentColor" />
                  <p className="text-sm font-bold text-foreground">{t("home.makeItReal")}</p>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { label: t("home.connectWithPartner"), icon: Users },
                    { label: t("home.addFirstMemory"), icon: Camera },
                    { label: t("home.startLoveJourney"), icon: Rocket },
                  ].map(s => (
                    <span key={s.label} className="inline-flex items-center gap-1.5 bg-card/60 px-2.5 py-1.5 rounded-full text-xs font-medium text-foreground">
                      <s.icon size={11} className="text-primary" /> {s.label}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Link to="/connect" className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5">
                    <Users size={12} /> {t("home.connectPartner")}
                  </Link>
                  <Link to="/memories" className="flex-1 h-9 rounded-xl bg-card border border-border text-foreground text-xs font-bold flex items-center justify-center gap-1.5">
                    <Camera size={12} /> {t("home.addMemory")}
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* === Fixed-order widget rendering === */}

          {/* 1. Mood Check-in */}
          {showWidget("mood-check") && (() => {
            const MOOD_EMOJI: Record<string, string> = { happy: "😊", excited: "🤩", neutral: "🥰", calm: "😌", grateful: "🙏", silly: "🤪", tired: "😵‍💫", sad: "😢", stressed: "😫", anxious: "😰", angry: "😠", furious: "🤬", lonely: "🥺", hopeful: "🌟", confused: "😕" };
            return (
              <motion.div key="mood-check" variants={item} className="space-y-2">
                <div className="flex gap-2">
                  <button onClick={() => navigate("/mood")} className="flex-1 bg-gradient-to-br from-secondary/15 to-secondary/5 rounded-2xl p-3 border border-secondary/20 text-left">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{myMood ? (MOOD_EMOJI[myMood.mood] || "✨") : "🌤️"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-muted-foreground">{t("home.yourMoodToday")}</p>
                        <p className="text-sm font-bold text-foreground truncate">
                          {myMood ? myMood.mood.charAt(0).toUpperCase() + myMood.mood.slice(1) : t("home.tapToLogMood")}
                        </p>
                      </div>
                    </div>
                  </button>
                  {!isSingle && (
                    <button onClick={() => partnerMood ? setShowMoodPopup(true) : navigate("/mood")} className="flex-1 bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl p-3 border border-primary/20 text-left">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{partnerMood ? (MOOD_EMOJI[partnerMood.mood] || "✨") : "✨"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground">{t("home.partnerFeeling")}</p>
                          <p className="text-sm font-bold text-foreground truncate">
                            {partnerMood ? partnerMood.mood.charAt(0).toUpperCase() + partnerMood.mood.slice(1) : t("home.noMoodYet")}
                          </p>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
                {myMood && (
                  <button onClick={() => navigate(`/chat?tab=ai&mood=${encodeURIComponent(myMood.mood)}${myMood.note ? `&note=${encodeURIComponent(myMood.note)}` : ""}`)} className="w-full flex items-center gap-2 bg-card rounded-xl px-3 py-2 border border-border">
                    <Brain size={12} className="text-primary shrink-0" />
                    {aiMoodLoading ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 size={10} className="animate-spin" /> Checking in…</span>
                    ) : (
                      <p className="text-xs text-muted-foreground truncate flex-1 text-left">{aiMoodCheckin || "Take a moment to check in… 💕"}</p>
                    )}
                  </button>
                )}
              </motion.div>
            );
          })()}

          {/* 2. Today's Agenda / Next Event */}
          {showWidget("next-event") && (
            <motion.div key="next-event" variants={item}>
              <Link to="/calendar" className="block love-gradient rounded-2xl p-4 shadow-elevated relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary-foreground/10 rounded-full -translate-y-8 translate-x-8" />
                {nextEvent ? (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-semibold text-primary-foreground/70 uppercase tracking-wider">{t("home.nextUp")}</p>
                      {getCountdownBadge(nextEvent) && (
                        <span className="text-[10px] font-bold bg-primary-foreground/20 text-primary-foreground px-2 py-0.5 rounded-full">
                          {getCountdownBadge(nextEvent)}
                        </span>
                      )}
                    </div>
                    <p className="text-base font-bold text-primary-foreground leading-tight">{nextEvent.title}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays size={12} className="text-primary-foreground/70" />
                        <span className="text-xs font-medium text-primary-foreground/80">{formatEventDate(nextEvent.event_date)}</span>
                      </div>
                      {nextEvent.event_time && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-primary-foreground/70" />
                          <span className="text-xs font-medium text-primary-foreground/80">{nextEvent.event_time}</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <CalendarDays size={18} className="text-primary-foreground/70" />
                    <p className="text-sm font-medium text-primary-foreground/80">{t("home.noEventsToday")}</p>
                  </div>
                )}
                {todayEvents.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-primary-foreground/15 flex items-center justify-between">
                    <p className="text-xs font-medium text-primary-foreground/70">{todayEvents.length} {isSingle ? "events" : t("home.sharedEvents").toLowerCase()} {t("common.today").toLowerCase()}</p>
                    <span className="text-[10px] font-semibold text-primary-foreground/60">{t("common.viewAll")} →</span>
                  </div>
                )}
              </Link>
            </motion.div>
          )}

          {/* 3. Active Plan Cards */}
          {activePlan && (
            <motion.div variants={item}>
              <Link
                to={activePlan.plan_type === "postpartum" ? "/postpartum" : "/physio"}
                className="block bg-gradient-to-r from-success/10 via-success/5 to-transparent rounded-2xl p-4 border border-success/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center shrink-0">
                    <Activity size={22} className="text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground truncate">{activePlan.title}</p>
                      <div className="flex items-center gap-0.5 bg-warning/10 px-1.5 py-0.5 rounded-full shrink-0">
                        <Flame size={10} className="text-warning" />
                        <span className="text-[10px] font-bold text-warning">
                          Day {Math.max(1, Math.floor((Date.now() - new Date(activePlan.started_at).getTime()) / (1000 * 60 * 60 * 24)) + 1)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Tap to continue your recovery →</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}
          {activeDietPlan && (
            <motion.div variants={item}>
              <Link
                to="/diet"
                className="block bg-gradient-to-r from-secondary/10 via-secondary/5 to-transparent rounded-2xl p-4 border border-secondary/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                    <Apple size={22} className="text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground truncate">{activeDietPlan.title}</p>
                      <div className="flex items-center gap-0.5 bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                        <Flame size={10} className="text-primary" />
                        <span className="text-[10px] font-bold text-primary">
                          Day {Math.max(1, Math.floor((Date.now() - new Date(activeDietPlan.started_at).getTime()) / (1000 * 60 * 60 * 24)) + 1)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Tap to track your diet plan →</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          {/* 4. Feature Bubbles (4 categories) */}
          {showWidget("quick-links") && (
            <motion.div key="quick-links" variants={item}>
              <FeatureBubbles
                isSingle={isSingle}
                uncheckedGroceries={uncheckedGroceries}
                pendingChores={pendingChores}
                totalEvents={totalEvents}
              />
            </motion.div>
          )}

          {/* 5. Urgent Chores */}
          {showWidget("urgent-chores") && (
            <motion.div key="urgent-chores" variants={item}>
              <div className="flex items-center justify-between mb-3">
                 <h2 className="text-base font-bold text-foreground">{t("home.urgentChores")}</h2>
                 <div className="flex items-center gap-2">
                   <button onClick={() => setShowAddChore(true)} className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                     <Plus size={14} className="text-primary" />
                   </button>
                   <Link to="/chores" className="text-sm text-muted-foreground font-medium">{t("common.manage")}</Link>
                </div>
              </div>
              <div className="space-y-2">
                {urgentChores.length === 0 ? (
                  <div className="bg-card rounded-2xl p-4 shadow-card text-center">
                    <p className="text-sm text-muted-foreground">{t("home.noPendingChores")}</p>
                  </div>
                ) : (
                  urgentChores.map(chore => (
                    <div key={chore.id} className="bg-card rounded-2xl px-4 py-3.5 shadow-card flex items-center gap-3">
                      <button
                        onClick={() => toggleChore(chore.id)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                          chore.is_completed ? "bg-success border-success" : "border-border"
                        }`}
                      >
                        {chore.is_completed && <Check size={14} className="text-success-foreground" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${chore.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{chore.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{chore.recurrence === "daily" ? t("home.dueNow") : chore.recurrence || t("home.once")}</p>
                      </div>
                    </div>
                  ))
                )}
                <AnimatePresence>
                  {showAddChore && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="flex gap-2 mt-2">
                        <input
                          value={newChoreTitle}
                          onChange={e => setNewChoreTitle(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && newChoreTitle.trim() && (async () => {
                            if (!user || !partnerPair) return;
                            const { data, error } = await supabase.from("chores").insert({
                              title: newChoreTitle.trim(), user_id: user.id, partner_pair: partnerPair,
                            }).select().single();
                            if (!error && data) {
                              setUrgentChores(prev => [...prev, { id: data.id, title: data.title, is_completed: false, recurrence: null }]);
                              setNewChoreTitle(""); setShowAddChore(false);
                            }
                          })()}
                          placeholder={t("home.quickAddChore")}
                          autoFocus
                          className="flex-1 h-10 bg-card rounded-xl px-3 text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                          onClick={async () => {
                            if (!newChoreTitle.trim() || !user || !partnerPair) return;
                            const { data, error } = await supabase.from("chores").insert({
                              title: newChoreTitle.trim(), user_id: user.id, partner_pair: partnerPair,
                            }).select().single();
                            if (!error && data) {
                              setUrgentChores(prev => [...prev, { id: data.id, title: data.title, is_completed: false, recurrence: null }]);
                              setNewChoreTitle(""); setShowAddChore(false);
                            }
                          }}
                          disabled={!newChoreTitle.trim()}
                          className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
                        >{t("common.add")}</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* 6. AI Insight */}
          {showWidget("ai-insight") && (
            !canAccess("daily-insight") ? (
              <motion.div key="ai-insight" variants={item}>
                <button onClick={() => navigate("/upgrade")} className="w-full flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2.5 border border-border">
                  <Sparkles size={12} className="text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground flex-1 text-left">{t("home.upgradeForInsight")}</p>
                  <span className="text-[10px] font-semibold text-primary">{t("home.upgradeNow")}</span>
                </button>
              </motion.div>
            ) : !insightDismissed ? (
              <motion.div key="ai-insight" variants={item}>
                <div className="flex items-center gap-2 bg-card rounded-xl px-3 py-2.5 border border-border">
                  <Sparkles size={12} className="text-primary shrink-0" />
                  {insightLoading && !aiInsight ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5 flex-1"><Loader2 size={10} className="animate-spin" /> Generating insight…</span>
                  ) : (
                    <p className="text-xs text-muted-foreground flex-1 leading-relaxed">{aiInsight || "Loading…"}</p>
                  )}
                  <button onClick={() => { fetchInsight(); setInsightDismissed(false); }} disabled={insightLoading} className="text-muted-foreground shrink-0">
                    <RefreshCw size={11} className={insightLoading ? "animate-spin" : ""} />
                  </button>
                  <button onClick={() => setInsightDismissed(true)} className="text-muted-foreground shrink-0">
                    <X size={11} />
                  </button>
                </div>
              </motion.div>
            ) : null
          )}

        </motion.div>


        <AddEventModal
          open={showAddEvent}
          onClose={() => setShowAddEvent(false)}
        />

        {/* Partner Mood Detail Popup */}
        <AnimatePresence>
          {showMoodPopup && partnerMood && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-foreground/40 z-[60]"
                onClick={() => setShowMoodPopup(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed inset-x-5 top-1/3 max-w-sm mx-auto bg-card rounded-3xl shadow-elevated z-[60] p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-foreground">{t("home.partnerMood")}</p>
                  <button onClick={() => setShowMoodPopup(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <X size={14} className="text-muted-foreground" />
                  </button>
                </div>

                <div className="flex flex-col items-center py-4">
                  <span className="text-5xl mb-3">
                    {{ happy: "😊", excited: "🤩", neutral: "🥰", calm: "😌", grateful: "🙏", silly: "🤪", tired: "😵‍💫", sad: "😢", stressed: "😫", anxious: "😰", angry: "😠", furious: "🤬", lonely: "🥺", hopeful: "🌟", confused: "😕" }[partnerMood.mood] || "🥰"}
                  </span>
                  <p className="text-lg font-bold text-foreground">
                    {partnerMood.mood.charAt(0).toUpperCase() + partnerMood.mood.slice(1)}
                  </p>
                  {partnerMood.note && (
                    <p className="text-sm text-muted-foreground mt-1 text-center">"{partnerMood.note}"</p>
                  )}
                </div>

                {/* Quick reactions - select, don't auto-send */}
                <p className="text-xs text-muted-foreground text-center mb-2">{t("mood.reactToMood")}</p>
                <div className="flex justify-center gap-3 mb-4 relative">
                  {["❤️", "🤗", "💪", "😘"].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => { setMoodReaction(prev => prev === emoji ? "" : emoji); setShowMoodEmojiPicker(false); }}
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all ${
                        moodReaction === emoji ? "scale-110 bg-primary/20 ring-2 ring-primary" : "bg-muted"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                  {/* + button for custom emoji */}
                  <button
                    onClick={() => setShowMoodEmojiPicker(prev => !prev)}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                      showMoodEmojiPicker ? "bg-primary/20 ring-2 ring-primary" : moodReaction && !["❤️", "🤗", "💪", "😘"].includes(moodReaction) ? "scale-110 bg-primary/20 ring-2 ring-primary text-xl" : "bg-muted"
                    }`}
                  >
                    {moodReaction && !["❤️", "🤗", "💪", "😘"].includes(moodReaction) ? moodReaction : <Plus size={18} className="text-muted-foreground" />}
                  </button>

                  {/* Emoji Picker Dropdown */}
                  <AnimatePresence>
                    {showMoodEmojiPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-14 left-0 right-0 bg-card rounded-2xl shadow-elevated border border-border p-3 z-10 max-h-[200px] overflow-y-auto"
                      >
                        <div className="grid grid-cols-8 gap-1">
                          {["😍","🥺","😭","🫶","💕","💗","💖","💘","🥰","😢","😮","🫂","🙌","✨","🔥","💯","👏","🎉","😂","😅","🤭","🫣","😳","🤩","💐","🌹","🍫","☕","🧸","🎵","🌈","🦋","💎","⭐","🌸","🌺","🍀","🌻","🐝","🦊"].map(e => (
                            <button key={e} onClick={() => { setMoodReaction(e); setShowMoodEmojiPicker(false); }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-lg active:scale-110 transition-transform">
                              {e}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Personal message */}
                <div className="mb-4">
                  <input
                    value={reactionMessage}
                    onChange={e => setReactionMessage(e.target.value)}
                    placeholder={t("mood.addMessage")}
                    className="w-full bg-muted rounded-xl px-4 h-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <button
                  onClick={async () => {
                    if ((!moodReaction && !reactionMessage.trim()) || !user || !partnerPair) return;
                    setSendingReaction(true);
                    const moodEmoji = { happy: "😊", excited: "🤩", neutral: "🥰", calm: "😌", grateful: "🙏", silly: "🤪", tired: "😵‍💫", sad: "😢", stressed: "😫", anxious: "😰", angry: "😠", furious: "🤬", lonely: "🥺", hopeful: "🌟", confused: "😕" }[partnerMood.mood] || "🥰";
                    const parts = [
                      moodReaction ? `${moodReaction} Reacted to your mood ${moodEmoji}` : "",
                      reactionMessage.trim(),
                    ].filter(Boolean);
                    const msg = parts.join("\n");
                    await supabase.from("chat_messages").insert({
                      user_id: user.id,
                      partner_pair: partnerPair,
                      message: msg,
                      type: "text",
                    });
                    setSendingReaction(false);
                    setMoodReaction("");
                    setReactionMessage("");
                    setShowMoodPopup(false);
                  }}
                  disabled={(!moodReaction && !reactionMessage.trim()) || sendingReaction}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Send size={14} />
                  {sendingReaction ? t("common.loading") : t("common.send")}
                </button>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setShowMoodPopup(false); setMoodReaction(""); setReactionMessage(""); navigate("/chat"); }}
                    className="flex-1 text-center text-xs text-primary font-medium py-2"
                  >
                    Write a message instead
                  </button>
                  <button
                    onClick={() => { setShowMoodPopup(false); setMoodReaction(""); setReactionMessage(""); navigate("/mood"); }}
                    className="flex-1 text-center text-xs text-muted-foreground font-medium py-2"
                  >
                    Log your mood too
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        <NotificationsPanel open={showNotifications} onClose={() => setShowNotifications(false)} />
      </div>
    </PageTransition>
  );
}
