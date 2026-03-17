import { Heart, CalendarDays, ShoppingCart, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLocalStorage, MOOD_EMOJIS, type MoodLog, type CalendarEvent, type Chore } from "@/lib/store";
import PageTransition from "@/components/PageTransition";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const [moods] = useLocalStorage<MoodLog[]>("lovelist-moods", []);
  const [events] = useLocalStorage<CalendarEvent[]>("lovelist-events", []);
  const [chores] = useLocalStorage<Chore[]>("lovelist-chores", []);

  const today = new Date().toISOString().split("T")[0];
  const todayMood = moods.find(m => m.date === today && m.user === "me");
  const partnerMood = moods.find(m => m.date === today && m.user === "partner");
  const upcomingEvents = events
    .filter(e => e.date >= today && !e.completed)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const pendingChores = chores.filter(c => !c.completed).length;

  return (
    <PageTransition>
      <div className="px-5 pt-12 pb-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <Heart className="text-primary" size={24} fill="hsl(346, 77%, 60%)" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">LoveList</h1>
        </div>

        {/* Mood Banner */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          <motion.div variants={item} className="love-gradient-soft rounded-2xl p-5 shadow-soft">
            <p className="text-sm font-medium text-muted-foreground mb-3">Today's Mood</p>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl mb-1">{todayMood ? MOOD_EMOJIS[todayMood.mood] : "❓"}</div>
                <p className="text-xs text-muted-foreground">You</p>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <Heart size={16} className="text-primary animate-pulse-love" fill="hsl(346, 77%, 60%)" />
              </div>
              <div className="text-center">
                <div className="text-3xl mb-1">{partnerMood ? MOOD_EMOJIS[partnerMood.mood] : "❓"}</div>
                <p className="text-xs text-muted-foreground">Partner</p>
              </div>
            </div>
            {!todayMood && (
              <Link to="/mood" className="block mt-3 text-xs font-medium text-primary text-center">
                Log your mood →
              </Link>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={item} className="grid grid-cols-3 gap-3">
            <QuickAction to="/calendar" icon={CalendarDays} label="Calendar" count={upcomingEvents.length} />
            <QuickAction to="/lists" icon={ShoppingCart} label="Groceries" />
            <QuickAction to="/chores" icon={ClipboardList} label="Chores" count={pendingChores} />
          </motion.div>

          {/* Upcoming Events */}
          <motion.div variants={item}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Upcoming</h2>
              <Link to="/calendar" className="text-xs text-primary font-medium">See all</Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <div className="bg-card rounded-xl p-6 shadow-card text-center">
                <p className="text-sm text-muted-foreground">No upcoming events</p>
                <Link to="/calendar" className="text-xs text-primary font-medium mt-1 inline-block">
                  Add your first event →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="bg-card rounded-xl px-4 py-3 shadow-card flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: `hsl(346, 77%, 60%)` }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.date} · {event.time || "All day"}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      event.priority === "high" ? "bg-destructive/10 text-destructive" :
                      event.priority === "medium" ? "bg-warning/10 text-warning" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {event.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </PageTransition>
  );
}

function QuickAction({ to, icon: Icon, label, count }: {
  to: string; icon: any; label: string; count?: number;
}) {
  return (
    <Link to={to} className="bg-card rounded-xl p-4 shadow-card flex flex-col items-center gap-2 hover:shadow-elevated transition-shadow">
      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
        <Icon size={18} className="text-secondary-foreground" />
      </div>
      <span className="text-xs font-medium text-foreground">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] font-semibold text-primary">{count} pending</span>
      )}
    </Link>
  );
}
