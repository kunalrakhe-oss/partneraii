import { Heart, ShoppingCart, MessageSquare, Check, Sparkles, Plus, Camera, CalendarDays, Clock, Image, Trophy, Loader2, RefreshCw, X, Send, Bell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import AddEventModal from "@/components/AddEventModal";
import { format, formatDistanceToNowStrict, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import NotificationsPanel, { useNotificationCount } from "@/components/NotificationsPanel";

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
  const { partnerPair } = usePartnerPair();
  const [firstName, setFirstName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [partnerMood, setPartnerMood] = useState<{ mood: string; note: string | null } | null>(null);
  const [todayEvents, setTodayEvents] = useState<{ id: string; title: string; event_time: string | null }[]>([]);
  const [urgentChores, setUrgentChores] = useState<{ id: string; title: string; is_completed: boolean; recurrence: string | null }[]>([]);
  const [uncheckedGroceries, setUncheckedGroceries] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [nextEvent, setNextEvent] = useState<NextEvent | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showMoodPopup, setShowMoodPopup] = useState(false);
  const [moodReaction, setMoodReaction] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useNotificationCount();

  // Analytics
  const [daysTogether, setDaysTogether] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalMemories, setTotalMemories] = useState(0);
  const [completedChores, setCompletedChores] = useState(0);
  const [pendingChores, setPendingChores] = useState(0);

  // AI Insight
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url, created_at").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        const raw = data?.display_name || user.user_metadata?.full_name || user.user_metadata?.display_name || user.user_metadata?.name || user.email?.split("@")[0] || "there";
        setFirstName(raw.split(" ")[0]);
        setAvatarUrl(data?.avatar_url || user.user_metadata?.avatar_url || null);
        if (data?.created_at) {
          const created = new Date(data.created_at);
          const diff = Math.max(1, Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)));
          setDaysTogether(diff);
        }
      });
  }, [user]);

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!partnerPair || !user) return;

    // Partner mood
    const fetchPartnerMood = () => {
      supabase.from("mood_logs").select("mood, note").eq("partner_pair", partnerPair).eq("log_date", today).neq("user_id", user.id).maybeSingle()
        .then(({ data }) => { setPartnerMood(data || null); });
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
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data) setNextEvent(data); });

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
    if (partnerPair && !aiInsight && !insightLoading && daysTogether > 0) {
      fetchInsight();
    }
  }, [partnerPair, daysTogether, fetchInsight, aiInsight, insightLoading]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const toggleChore = async (id: string) => {
    const chore = urgentChores.find(c => c.id === id);
    if (!chore) return;
    await supabase.from("chores").update({ is_completed: !chore.is_completed }).eq("id", id);
    setUrgentChores(prev => prev.map(c => c.id === id ? { ...c, is_completed: !c.is_completed } : c));
  };

  const formatEventDate = (dateStr: string) => {
    const d = parseISO(dateStr);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
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
            <div>
              <h1 className="text-2xl font-bold text-foreground">{greeting}, {firstName}</h1>
              <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowNotifications(true)} className="relative w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Bell size={18} className="text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              <button onClick={() => navigate("/profile")} className="w-11 h-11 rounded-full bg-muted overflow-hidden flex items-center justify-center border-2 border-border">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg">👩</span>
                )}
              </button>
            </div>
          </motion.div>

          {/* Next Upcoming Event */}
          {nextEvent && (
            <motion.div variants={item}>
              <Link to="/calendar" className="block love-gradient rounded-2xl p-4 shadow-elevated relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary-foreground/10 rounded-full -translate-y-8 translate-x-8" />
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-primary-foreground/70 uppercase tracking-wider">Next Up</p>
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
          )}

          {/* Partnership Analytics */}
          <motion.div variants={item}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Partnership Stats</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Days", value: daysTogether, icon: Heart, color: "bg-secondary/15 text-secondary" },
                { label: "Events", value: totalEvents, icon: CalendarDays, color: "bg-primary/15 text-primary" },
                { label: "Memories", value: totalMemories, icon: Image, color: "bg-accent/20 text-accent-foreground" },
                { label: "Done", value: completedChores, icon: Trophy, color: "bg-success/15 text-success" },
              ].map(stat => (
                <div key={stat.label} className="bg-card rounded-2xl p-3 shadow-card flex flex-col items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon size={14} />
                  </div>
                  <p className="text-base font-bold text-foreground leading-none">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Partner's Mood */}
          <motion.div variants={item}>
            <p className="text-sm font-semibold text-foreground mb-2">Partner's Mood</p>
            <button onClick={() => partnerMood && setShowMoodPopup(true)} className="w-full text-left">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-primary/20 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <span className="text-xl">✨</span>
                  <div>
                    <p className="text-xs text-foreground/70">Your partner is feeling</p>
                    <p className="text-sm font-bold text-foreground">
                      {partnerMood ? partnerMood.mood.charAt(0).toUpperCase() + partnerMood.mood.slice(1) : "—"}
                    </p>
                    {partnerMood?.note && (
                      <p className="text-xs text-foreground/50 mt-0.5">"{partnerMood.note}"</p>
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-btn bg-secondary/20 flex items-center justify-center shrink-0">
                  <Heart size={20} className="text-secondary" fill="currentColor" />
                </div>
              </div>
            </button>
          </motion.div>

          {/* Today's Agenda Card */}
          <motion.div variants={item} className="bg-primary/25 rounded-card p-5 shadow-soft">
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

          {/* Quick Links */}
          <motion.div variants={item} className="grid grid-cols-3 gap-3">
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
          </motion.div>

          {/* Urgent Chores */}
          <motion.div variants={item}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-foreground">Urgent Chores</h2>
              <Link to="/chores" className="text-sm text-muted-foreground font-medium">Manage</Link>
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
            </div>
          </motion.div>

          {/* AI Insight — Powered by Lovable AI */}
          <motion.div variants={item} className="love-gradient-soft border border-border rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={16} className="text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-xs font-bold text-foreground">LoveList AI Insight</p>
                <button
                  onClick={fetchInsight}
                  disabled={insightLoading}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw size={12} className={insightLoading ? "animate-spin" : ""} />
                </button>
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

        </motion.div>

        {/* Floating New Event FAB */}
        <button
          onClick={() => setShowAddEvent(true)}
          className="fixed bottom-20 right-5 max-w-lg love-gradient text-primary-foreground px-5 py-3 rounded-btn flex items-center gap-2 shadow-elevated text-sm font-semibold z-40"
        >
          <Plus size={16} />
          New Event
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
                    {partnerMood.mood === "happy" ? "😊" : partnerMood.mood === "tired" ? "😵‍💫" : partnerMood.mood === "sad" ? "😢" : partnerMood.mood === "angry" ? "😫" : "🥰"}
                  </span>
                  <p className="text-lg font-bold text-foreground">
                    {partnerMood.mood.charAt(0).toUpperCase() + partnerMood.mood.slice(1)}
                  </p>
                  {partnerMood.note && (
                    <p className="text-sm text-muted-foreground mt-1 text-center">"{partnerMood.note}"</p>
                  )}
                </div>

                {/* Quick reactions */}
                <div className="flex justify-center gap-3 mb-4">
                  {["❤️", "🤗", "💪", "😘"].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setMoodReaction(emoji);
                        setTimeout(() => { setMoodReaction(""); setShowMoodPopup(false); navigate("/chat"); }, 400);
                      }}
                      className={`w-11 h-11 rounded-full bg-muted flex items-center justify-center text-xl transition-transform ${moodReaction === emoji ? "scale-125 bg-primary/20" : ""}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => { setShowMoodPopup(false); navigate("/chat"); }}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  Send a message
                </button>

                <button
                  onClick={() => { setShowMoodPopup(false); navigate("/mood"); }}
                  className="w-full text-center text-xs text-muted-foreground font-medium mt-3"
                >
                  Log your mood too
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        <NotificationsPanel open={showNotifications} onClose={() => setShowNotifications(false)} />
      </div>
    </PageTransition>
  );
}
