import { Heart, ShoppingCart, MessageSquare, Check, Sparkles, Plus, Camera, CalendarDays, Clock, Image, Trophy, Loader2, RefreshCw, X, Send, Bell, Users, BookOpen, Rocket, BookHeart, Dumbbell, Apple } from "lucide-react";
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
  const [partnerProfile, setPartnerProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [partnerMood, setPartnerMood] = useState<{ mood: string; note: string | null } | null>(null);
  const [myMood, setMyMood] = useState<{ mood: string; note: string | null } | null>(null);
  const [todayEvents, setTodayEvents] = useState<{ id: string; title: string; event_time: string | null }[]>([]);
  const [urgentChores, setUrgentChores] = useState<{ id: string; title: string; is_completed: boolean; recurrence: string | null }[]>([]);
  const [uncheckedGroceries, setUncheckedGroceries] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [nextEvent, setNextEvent] = useState<NextEvent | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
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

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url, created_at, partner_id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        const raw = data?.display_name || user.user_metadata?.full_name || user.user_metadata?.display_name || user.user_metadata?.name || user.email?.split("@")[0] || "there";
        setFirstName(raw.split(" ")[0]);
        setAvatarUrl(data?.avatar_url || user.user_metadata?.avatar_url || null);
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

  // Fetch AI insight
  const fetchInsight = useCallback(async () => {
    if (insightLoading) return;
    setInsightLoading(true);
    try {
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

      const { data, error } = await supabase.functions.invoke("daily-insight", {
        body: {
          language: localStorage.getItem("lovelist-language") || "en",
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
      setAiInsight("Keep building your love story together! 💕");
    } finally {
      setInsightLoading(false);
    }
  }, [daysTogether, pendingChores, completedChores, uncheckedGroceries, todayEvents.length, totalMemories, messageCount, partnerMood]);

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
      <div className="px-5 pt-10 pb-6">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
          {/* Header */}
          <motion.div variants={item} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ProfileButton />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{greeting}, {firstName}</h1>
                <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Couple Avatars */}
              {partnerProfile && !isDemoMode && (
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




          {/* ❤️ Make it Real - Getting Started */}
          {isDemoMode && (
            <motion.div variants={item}>
              <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 rounded-2xl p-5 border border-primary/20 shadow-soft">
                <div className="flex items-center gap-2 mb-1">
                  <Heart size={16} className="text-primary" fill="currentColor" />
                   <p className="text-sm font-bold text-foreground">{t("home.makeItReal")}</p>
                 </div>
                 <p className="text-xs text-muted-foreground mb-4">{t("home.startJourney")}</p>

                <div className="space-y-3 mb-5">
                  {[
                    { step: 1, label: t("home.connectWithPartner"), icon: Users, done: false },
                    { step: 2, label: t("home.addFirstMemory"), icon: Camera, done: false },
                    { step: 3, label: t("home.startLoveJourney"), icon: Rocket, done: false },
                  ].map(s => (
                    <div key={s.step} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        s.done ? "bg-success/20" : "bg-primary/15"
                      }`}>
                        {s.done ? (
                          <Check size={14} className="text-success" />
                        ) : (
                          <s.icon size={14} className="text-primary" />
                        )}
                      </div>
                      <p className={`text-sm font-medium ${s.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Link
                    to="/connect"
                    className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 shadow-soft"
                  >
                    <Users size={13} />
                     {t("home.connectPartner")}
                   </Link>
                   <Link
                     to="/memories"
                     className="flex-1 h-10 rounded-xl bg-card border border-border text-foreground text-xs font-bold flex items-center justify-center gap-1.5 shadow-card"
                   >
                     <Camera size={13} />
                     {t("home.addMemory")}
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* Ordered Widgets */}
          {visibleWidgets.map(widgetId => {
            switch (widgetId) {
              case "next-event":
                return nextEvent ? (
                  <motion.div key="next-event" variants={item}>
                    <Link to="/calendar" className="block love-gradient rounded-2xl p-4 shadow-elevated relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary-foreground/10 rounded-full -translate-y-8 translate-x-8" />
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-semibold text-primary-foreground/70 uppercase tracking-wider">{t("home.nextUp")}</p>
                        {getCountdownBadge(nextEvent) && (
                          <span className="text-[10px] font-bold bg-primary-foreground/20 text-primary-foreground px-2 py-0.5 rounded-full">
                            {getCountdownBadge(nextEvent)}
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-bold text-primary-foreground leading-tight">{nextEvent.title}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays size={13} className="text-primary-foreground/70" />
                          <span className="text-xs font-medium text-primary-foreground/80">{formatEventDate(nextEvent.event_date)}</span>
                        </div>
                        {nextEvent.event_time && (
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-primary-foreground/70" />
                            <span className="text-xs font-medium text-primary-foreground/80">{nextEvent.event_time}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ) : null;

              case "partnership-stats":
                return (
                  <motion.div key="partnership-stats" variants={item}>
                     <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("home.partnershipStats")}</p>
                     <div className="grid grid-cols-2 gap-3">
                       {[
                         { label: t("home.daysTogether"), value: daysTogether, icon: Heart, gradient: "from-secondary/20 to-secondary/5", iconBg: "bg-secondary/20", iconColor: "text-secondary", link: "/memories" },
                         { label: t("home.events"), value: totalEvents, icon: CalendarDays, gradient: "from-primary/20 to-primary/5", iconBg: "bg-primary/20", iconColor: "text-primary", link: "/calendar" },
                         { label: t("home.memories"), value: totalMemories, icon: Image, gradient: "from-accent/20 to-accent/5", iconBg: "bg-accent/20", iconColor: "text-accent-foreground", link: "/memories" },
                         { label: t("home.tasksDone"), value: completedChores, icon: Trophy, gradient: "from-success/20 to-success/5", iconBg: "bg-success/20", iconColor: "text-success", link: "/chores" },
                      ].map(stat => (
                        <button
                          key={stat.label}
                          onClick={() => navigate(stat.link)}
                          className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-4 flex items-center gap-3 border border-border/30 hover:scale-[1.02] transition-transform active:scale-[0.98]`}
                        >
                          <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center shrink-0`}>
                            <stat.icon size={18} className={stat.iconColor} />
                          </div>
                          <div className="text-left">
                            <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                );

              case "mood-check":
                return !myMood && !isDemoMode ? (
                  <motion.div key="mood-check" variants={item}>
                    <button onClick={() => navigate("/mood")} className="w-full bg-gradient-to-r from-secondary/20 via-primary/10 to-secondary/20 rounded-2xl p-4 border border-secondary/30 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                          <span className="text-2xl">🌤️</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-foreground">{t("home.howFeeling")}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t("home.tapToLogMood")}</p>
                        </div>
                        <Heart size={16} className="text-secondary shrink-0" />
                      </div>
                    </button>
                  </motion.div>
                ) : null;

              case "partner-mood":
                return (
                  <motion.div key="partner-mood" variants={item}>
                    <p className="text-sm font-semibold text-foreground mb-2">{t("home.partnerMood")}</p>
                    <button onClick={() => partnerMood ? setShowMoodPopup(true) : navigate("/mood")} className="w-full text-left">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-primary/20 rounded-2xl px-4 py-3 flex items-center gap-3">
                          <span className="text-xl">
                            {partnerMood ? ({ happy: "😊", excited: "🤩", neutral: "🥰", calm: "😌", grateful: "🙏", silly: "🤪", tired: "😵‍💫", sad: "😢", stressed: "😫", anxious: "😰", angry: "😠", furious: "🤬", lonely: "🥺", hopeful: "🌟", confused: "😕" }[partnerMood.mood] || "✨") : "✨"}
                          </span>
                          <div>
                             <p className="text-xs text-foreground/70">{t("home.partnerFeeling")}</p>
                             <p className="text-sm font-bold text-foreground">
                               {partnerMood ? partnerMood.mood.charAt(0).toUpperCase() + partnerMood.mood.slice(1) : t("home.noMoodYet")}
                            </p>
                            {partnerMood?.note && (
                              <p className="text-xs text-foreground/50 mt-0.5">"{partnerMood.note}"</p>
                            )}
                            {!partnerMood && (
                              <p className="text-xs text-muted-foreground mt-0.5">Nudge them to check in ❤️</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );

              case "today-agenda":
                return (
                  <motion.div key="today-agenda" variants={item} className="bg-primary/25 rounded-card p-5 shadow-soft">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-foreground/70">Today's Agenda</p>
                      <Link to="/calendar" className="text-xs font-medium bg-card/80 text-foreground px-3 py-1 rounded-full">View All</Link>
                    </div>
                    <p className="text-xl font-bold text-foreground mb-4">{todayEvents.length} Shared Events</p>
                    <div className="space-y-2">
                      {todayEvents.length === 0 ? (
                        <p className="text-sm text-foreground/60">No events scheduled for today</p>
                      ) : (
                        todayEvents.slice(0, 3).map(event => (
                          <div key={event.id} className="flex items-center gap-3">
                            <div className="w-0.5 h-8 bg-foreground/30 rounded-full" />
                            <div>
                              <p className="text-[10px] text-foreground/60">{event.event_time || "All day"}</p>
                              <p className="text-sm font-semibold text-foreground">{event.title}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                );

              case "add-memory":
                return (
                  <motion.div key="add-memory" variants={item}>
                    <button
                      onClick={() => navigate("/memories?add=true")}
                      className="w-full bg-gradient-to-r from-accent/15 via-primary/10 to-accent/15 rounded-2xl p-4 border border-accent/20 text-left hover:scale-[1.01] active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                          <BookHeart size={22} className="text-accent-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-foreground">Add a Memory or Note</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Capture a special moment together 💕</p>
                        </div>
                        <Plus size={18} className="text-muted-foreground shrink-0" />
                      </div>
                    </button>
                  </motion.div>
                );

              case "quick-links":
                return (
                  <motion.div key="quick-links" variants={item} className="grid grid-cols-3 gap-3">
                    <Link to="/lists" className="bg-card rounded-2xl p-4 shadow-card flex flex-col gap-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <ShoppingCart size={18} className="text-foreground" />
                      </div>
                      <p className="text-sm font-bold text-foreground">Groceries</p>
                      <p className="text-xs text-muted-foreground">{uncheckedGroceries} items</p>
                    </Link>
                    <Link to="/chat" className="bg-card rounded-2xl p-4 shadow-card flex flex-col gap-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                        <MessageSquare size={18} className="text-primary" />
                      </div>
                      <p className="text-sm font-bold text-foreground">Chat</p>
                      <p className="text-xs text-muted-foreground">{messageCount} msgs</p>
                    </Link>
                    <Link to="/memories" className="bg-card rounded-2xl p-4 shadow-card flex flex-col gap-2">
                      <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                        <Camera size={18} className="text-accent-foreground" />
                      </div>
                      <p className="text-sm font-bold text-foreground">Memories</p>
                      <p className="text-xs text-muted-foreground">Timeline</p>
                    </Link>
                    <Link to="/workout" className="bg-card rounded-2xl p-4 shadow-card flex flex-col gap-2">
                      <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
                        <Dumbbell size={18} className="text-destructive" />
                      </div>
                      <p className="text-sm font-bold text-foreground">Workout</p>
                      <p className="text-xs text-muted-foreground">Stay fit</p>
                    </Link>
                    <Link to="/diet" className="bg-card rounded-2xl p-4 shadow-card flex flex-col gap-2">
                      <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center">
                        <Apple size={18} className="text-secondary" />
                      </div>
                      <p className="text-sm font-bold text-foreground">Diet</p>
                      <p className="text-xs text-muted-foreground">Eat well</p>
                    </Link>
                  </motion.div>
                );

              case "urgent-chores":
                return (
                  <motion.div key="urgent-chores" variants={item}>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-bold text-foreground">Urgent Chores</h2>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setShowAddChore(true)} className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                          <Plus size={14} className="text-primary" />
                        </button>
                        <Link to="/chores" className="text-sm text-muted-foreground font-medium">Manage</Link>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {urgentChores.length === 0 ? (
                        <div className="bg-card rounded-2xl p-4 shadow-card text-center">
                          <p className="text-sm text-muted-foreground">No pending chores 🎉</p>
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
                              <p className="text-xs text-muted-foreground capitalize">{chore.recurrence === "daily" ? "Due now" : chore.recurrence || "Once"}</p>
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
                                placeholder="Quick add chore..."
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
                              >Add</button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );

              case "ai-insight":
                if (!canAccess("daily-insight")) {
                  return (
                    <motion.div key="ai-insight" variants={item} className="border border-border rounded-2xl p-4 flex items-start gap-3 bg-muted/50">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles size={16} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground">LoveList AI Insight</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Upgrade to Pro for daily AI-powered insights.</p>
                        <button onClick={() => navigate("/upgrade")} className="text-xs font-semibold text-primary mt-1.5">Upgrade →</button>
                      </div>
                    </motion.div>
                  );
                }
                return !insightDismissed ? (
                  <motion.div key="ai-insight" variants={item} className="love-gradient-soft border border-border rounded-2xl p-4 flex items-start gap-3 cursor-pointer"
                    onClick={() => setInsightDismissed(true)}>
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={16} className="text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-bold text-foreground">LoveList AI Insight</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); fetchInsight(); setInsightDismissed(false); }}
                            disabled={insightLoading}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <RefreshCw size={12} className={insightLoading ? "animate-spin" : ""} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setInsightDismissed(true); }} className="text-muted-foreground hover:text-foreground transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                      {insightLoading && !aiInsight ? (
                        <div className="flex items-center gap-2 py-1">
                          <Loader2 size={12} className="animate-spin text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Generating insight…</span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {aiInsight || "Loading your personalized insight…"}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ) : null;

              default:
                return null;
            }
          })}

        </motion.div>

        {/* Floating New Event FAB - icon only */}
        <button
          onClick={() => setShowAddEvent(true)}
          className="fixed bottom-above-nav right-5 max-w-lg love-gradient text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center shadow-elevated z-40"
        >
          <Plus size={20} />
        </button>

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
                  <p className="text-sm font-bold text-foreground">Partner's Mood</p>
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
                <p className="text-xs text-muted-foreground text-center mb-2">React to their mood</p>
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
                    placeholder="Add a personal message..."
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
                  {sendingReaction ? "Sending..." : "Send"}
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
