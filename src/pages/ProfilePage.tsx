import { Heart, Settings, User, Calendar, MessageCircle } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { useLocalStorage, type CalendarEvent, type GroceryItem, type MoodLog, type Chore, type ChatMessage } from "@/lib/store";

export default function ProfilePage() {
  const [events] = useLocalStorage<CalendarEvent[]>("lovelist-events", []);
  const [groceries] = useLocalStorage<GroceryItem[]>("lovelist-groceries", []);
  const [moods] = useLocalStorage<MoodLog[]>("lovelist-moods", []);
  const [chores] = useLocalStorage<Chore[]>("lovelist-chores", []);
  const [messages] = useLocalStorage<ChatMessage[]>("lovelist-chat", []);

  const stats = [
    { label: "Events", value: events.length, icon: Calendar },
    { label: "Messages", value: messages.length, icon: MessageCircle },
    { label: "Mood Logs", value: moods.length, icon: Heart },
  ];

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-xl font-bold text-foreground mb-6">Profile</h1>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full love-gradient flex items-center justify-center mb-3 shadow-soft">
            <User size={32} className="text-primary-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">You & Partner</h2>
          <p className="text-xs text-muted-foreground">Together in LoveList 💕</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {stats.map(s => (
            <div key={s.label} className="bg-card rounded-xl p-4 shadow-card text-center">
              <s.icon size={18} className="text-primary mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="space-y-2">
          {[
            { label: "Grocery Items", count: groceries.length },
            { label: "Active Chores", count: chores.filter(c => !c.completed).length },
            { label: "Completed Tasks", count: events.filter(e => e.completed).length },
          ].map(item => (
            <div key={item.label} className="bg-card rounded-xl px-4 py-3 shadow-card flex items-center justify-between">
              <span className="text-sm text-foreground">{item.label}</span>
              <span className="text-sm font-semibold text-primary">{item.count}</span>
            </div>
          ))}
        </div>

        {/* Settings hint */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Settings size={14} />
            <span>Backend features coming soon with Lovable Cloud</span>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
