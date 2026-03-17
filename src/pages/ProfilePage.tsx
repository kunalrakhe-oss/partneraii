import { Heart, User, ChevronRight, Bell, Lock, HelpCircle, Palette, Link2, LogOut, Edit } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { useLocalStorage, type CalendarEvent, type GroceryItem, type MoodLog, type Chore, type ChatMessage } from "@/lib/store";

export default function ProfilePage() {
  const [events] = useLocalStorage<CalendarEvent[]>("lovelist-events", []);
  const [moods] = useLocalStorage<MoodLog[]>("lovelist-moods", []);
  const [chores] = useLocalStorage<Chore[]>("lovelist-chores", []);

  const completedTasks = chores.filter(c => c.completed).length + events.filter(e => e.completed).length;
  const moodSync = moods.length > 0 ? "94%" : "—";

  const settingsSections = [
    {
      title: "Account Settings",
      items: [
        { icon: User, label: "Personal Information", sub: "Email, Phone, Birthday" },
        { icon: Bell, label: "Notifications", sub: "Reminders & Alerts" },
        { icon: Heart, label: "Couple Connection", sub: "Manage shared access" },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: Palette, label: "Theme & Appearance" },
        { icon: Lock, label: "Privacy & Security" },
        { icon: HelpCircle, label: "Help & Support" },
      ],
    },
  ];

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-9" />
          <h1 className="text-base font-bold text-foreground">Profile</h1>
          <button className="w-9 h-9 rounded-full flex items-center justify-center">
            <Edit size={16} className="text-foreground" />
          </button>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border overflow-hidden">
              <span className="text-3xl">👩</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-success border-2 border-card flex items-center justify-center">
              <Heart size={10} className="text-success-foreground" fill="white" />
            </div>
          </div>
          <h2 className="text-base font-bold text-foreground">Sarah Jenkins</h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Link2 size={10} /> Connected to Mark
          </p>
        </div>

        {/* Stats */}
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border flex justify-around mb-5">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">428</p>
            <p className="text-[10px] text-muted-foreground">Days Together</p>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">1.2k</p>
            <p className="text-[10px] text-muted-foreground">Tasks Done</p>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{moodSync}</p>
            <p className="text-[10px] text-muted-foreground">Mood Sync</p>
          </div>
        </div>

        {/* Premium Card */}
        <div className="bg-[hsl(100,20%,72%)] rounded-2xl p-5 mb-6 relative overflow-hidden">
          <span className="text-[10px] font-bold text-foreground bg-foreground/10 px-2 py-0.5 rounded-full">PREMIUM</span>
          <h3 className="text-base font-bold text-foreground mt-2">LoveList Plus</h3>
          <p className="text-xs text-foreground/70 mt-1 mb-3">Unlock AI Relationship Coach & Memory Wall</p>
          <button className="w-full h-10 rounded-xl bg-foreground/80 text-background text-sm font-semibold">
            Upgrade Now
          </button>
        </div>

        {/* Settings Sections */}
        {settingsSections.map(section => (
          <div key={section.title} className="mb-5">
            <p className="text-xs font-semibold text-muted-foreground mb-2">{section.title}</p>
            <div className="space-y-1">
              {section.items.map(item => (
                <button key={item.label} className="w-full bg-card rounded-2xl px-4 py-3.5 shadow-card border border-border flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <item.icon size={16} className="text-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    {item.sub && <p className="text-[10px] text-muted-foreground">{item.sub}</p>}
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Sign Out */}
        <button className="w-full text-center py-3 text-sm font-medium text-primary">
          Sign Out
        </button>

        <p className="text-center text-[10px] text-muted-foreground mt-3 mb-2">
          LoveList v1.0.4 • Made with Love
        </p>
      </div>
    </PageTransition>
  );
}
