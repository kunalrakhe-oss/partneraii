import { Heart, ShoppingCart, MessageSquare, Check, Sparkles, Plus, Camera } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [partnerMood, setPartnerMood] = useState<{ mood: string; note: string | null } | null>(null);
  const [todayEvents, setTodayEvents] = useState<{ id: string; title: string; event_time: string | null }[]>([]);
  const [urgentChores, setUrgentChores] = useState<{ id: string; title: string; is_completed: boolean; recurrence: string | null }[]>([]);
  const [uncheckedGroceries, setUncheckedGroceries] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        const profileName = data?.display_name;
        const metaName = user.user_metadata?.full_name || user.user_metadata?.display_name || user.user_metadata?.name;
        const emailName = user.email?.split("@")[0];
        const name = (profileName && profileName.includes(" ")) ? profileName : (metaName || profileName || emailName || "there");
        setDisplayName(name);
        setAvatarUrl(data?.avatar_url || user.user_metadata?.avatar_url || null);
      });
  }, [user]);

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!partnerPair || !user) return;
    // Fetch partner mood
    supabase.from("mood_logs").select("mood, note").eq("partner_pair", partnerPair).eq("log_date", today).neq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setPartnerMood(data); });
    // Fetch today's events
    supabase.from("calendar_events").select("id, title, event_time").eq("partner_pair", partnerPair).eq("event_date", today).eq("is_completed", false)
      .then(({ data }) => { if (data) setTodayEvents(data); });
    // Fetch chores
    supabase.from("chores").select("id, title, is_completed, recurrence").eq("partner_pair", partnerPair).eq("is_completed", false).limit(3)
      .then(({ data }) => { if (data) setUrgentChores(data); });
    // Fetch grocery count
    supabase.from("grocery_items").select("id", { count: "exact", head: true }).eq("partner_pair", partnerPair).eq("is_checked", false)
      .then(({ count }) => { setUncheckedGroceries(count ?? 0); });
    // Fetch message count
    supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("partner_pair", partnerPair)
      .then(({ count }) => { setMessageCount(count ?? 0); });
  }, [partnerPair, user, today]);

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

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-6">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
          {/* Header */}
          <motion.div variants={item} className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{greeting}, {displayName.toUpperCase()}</h1>
              <p className="text-sm text-muted-foreground">{format(new Date(), "MMMM d, yyyy")}</p>
            </div>
            <button onClick={() => navigate("/profile")} className="w-11 h-11 rounded-full bg-muted overflow-hidden flex items-center justify-center border-2 border-border">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg">👩</span>
              )}
            </button>
          </motion.div>

          {/* Partner's Mood */}
          <motion.div variants={item}>
            <p className="text-sm font-semibold text-foreground mb-2">Partner's Mood</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-primary/20 rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl">✨</span>
                <div>
                  <p className="text-xs text-foreground/70">James is feeling</p>
                  <p className="text-sm font-bold text-foreground">
                    {partnerMood ? partnerMood.mood.charAt(0).toUpperCase() + partnerMood.mood.slice(1) : "Inspired"}
                  </p>
                </div>
              </div>
              <button className="w-12 h-12 rounded-btn bg-secondary/20 flex items-center justify-center">
                <Heart size={20} className="text-secondary" fill="currentColor" />
              </button>
            </div>
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
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-0.5 h-8 bg-foreground/30 rounded-full" />
                    <div>
                      <p className="text-[10px] text-foreground/60">08:30 AM</p>
                      <p className="text-sm font-semibold text-foreground">Morning Coffee & Planning</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-0.5 h-8 bg-foreground/30 rounded-full" />
                    <div>
                      <p className="text-[10px] text-foreground/60">07:00 PM</p>
                      <p className="text-sm font-semibold text-foreground">Dinner Date: The Green Bistro</p>
                    </div>
                  </div>
                </>
              ) : (
                todayEvents.slice(0, 2).map(event => (
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
              <div className="w-10 h-10 rounded-xl bg-[hsl(100,25%,78%)] flex items-center justify-center">
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
                <Camera size={18} className="text-accent" />
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

          {/* AI Insight */}
          <motion.div variants={item} className="love-gradient-soft border border-border rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-[hsl(100,20%,72%)] flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={16} className="text-foreground" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground mb-0.5">LoveList AI Insight</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                James has had a busy week. Maybe surprise him with his favorite chocolate tonight?
              </p>
            </div>
          </motion.div>

          {/* New Event FAB */}
          <motion.div variants={item} className="flex justify-end">
            <button
              onClick={() => navigate("/calendar")}
              className="bg-foreground text-background px-5 py-3 rounded-full flex items-center gap-2 shadow-elevated text-sm font-semibold"
            >
              <Plus size={16} />
              New Event
            </button>
          </motion.div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
