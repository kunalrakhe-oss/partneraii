import { Heart, ShoppingCart, MessageSquare, Check, Sparkles, Plus, Camera } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLocalStorage, MOOD_EMOJIS, type MoodLog, type CalendarEvent, type Chore, type GroceryItem, type ChatMessage } from "@/lib/store";
import PageTransition from "@/components/PageTransition";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!user) return;
    // Try profile first, fall back to user metadata
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(
          data?.display_name ||
          user.user_metadata?.display_name ||
          user.email?.split("@")[0] ||
          "there"
        );
      });
  }, [user]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();
  const [moods] = useLocalStorage<MoodLog[]>("lovelist-moods", []);
  const [events] = useLocalStorage<CalendarEvent[]>("lovelist-events", []);
  const [chores, setChores] = useLocalStorage<Chore[]>("lovelist-chores", []);
  const [groceries] = useLocalStorage<GroceryItem[]>("lovelist-groceries", []);
  const [messages] = useLocalStorage<ChatMessage[]>("lovelist-chat", []);

  const today = new Date().toISOString().split("T")[0];
  const partnerMood = moods.find(m => m.date === today && m.user === "partner");
  const todayEvents = events.filter(e => e.date === today && !e.completed);
  const urgentChores = chores.filter(c => !c.completed).slice(0, 3);
  const uncheckedGroceries = groceries.filter(g => !g.checked).length;

  const toggleChore = (id: string) => {
    setChores(chores.map(c => c.id === id ? { ...c, completed: !c.completed, lastCompleted: new Date().toISOString() } : c));
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
            <div className="w-11 h-11 rounded-full bg-muted overflow-hidden flex items-center justify-center">
              <span className="text-lg">👩</span>
            </div>
          </motion.div>

          {/* Partner's Mood */}
          <motion.div variants={item}>
            <p className="text-sm font-semibold text-foreground mb-2">Partner's Mood</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-[hsl(100,25%,78%)] rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl">✨</span>
                <div>
                  <p className="text-xs text-foreground/70">James is feeling</p>
                  <p className="text-sm font-bold text-foreground">
                    {partnerMood ? partnerMood.mood.charAt(0).toUpperCase() + partnerMood.mood.slice(1) : "Inspired"}
                  </p>
                </div>
              </div>
              <button className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                <Heart size={20} className="text-primary" fill="hsl(346, 77%, 60%)" />
              </button>
            </div>
          </motion.div>

          {/* Today's Agenda Card */}
          <motion.div variants={item} className="bg-[hsl(100,20%,72%)] rounded-2xl p-5 shadow-soft">
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
                      <p className="text-[10px] text-foreground/60">{event.time || "All day"}</p>
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
              <p className="text-xs text-muted-foreground">{messages.length} msgs</p>
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
                        chore.completed ? "bg-success border-success" : "border-border"
                      }`}
                    >
                      {chore.completed && <Check size={14} className="text-success-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${chore.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{chore.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{chore.frequency === "daily" ? "Due now" : chore.frequency}</p>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {chore.assignedTo === "partner1" ? "S" : chore.assignedTo === "partner2" ? "J" : "R"}
                      </span>
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
