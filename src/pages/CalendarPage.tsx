import { useState } from "react";
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay, isToday, addWeeks, subWeeks } from "date-fns";
import { Plus, X, Search, Check, Coffee, ShoppingCart, Tv, Cake, CalendarPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalStorage, generateId, type CalendarEvent } from "@/lib/store";
import PageTransition from "@/components/PageTransition";

const CATEGORIES = ["date-night", "groceries", "cleaning", "bills", "travel", "family"] as const;
const CATEGORY_ICONS: Record<string, any> = {
  "date-night": Coffee,
  groceries: ShoppingCart,
  cleaning: Tv,
  travel: Cake,
  family: Cake,
  bills: Cake,
};
const CATEGORY_ICON_BG: Record<string, string> = {
  "date-night": "bg-primary/15",
  groceries: "bg-success/15",
  cleaning: "bg-accent/15",
  travel: "bg-warning/15",
  family: "bg-secondary",
  bills: "bg-muted",
};
const CATEGORY_LABEL: Record<string, string> = {
  "date-night": "Romance",
  groceries: "Household",
  cleaning: "Cleaning",
  bills: "Bills",
  travel: "Travel",
  family: "Family",
};

type ViewMode = "day" | "week" | "month";

export default function CalendarPage() {
  const [events, setEvents] = useLocalStorage<CalendarEvent[]>("lovelist-events", []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("day");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 5) });

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const dayEvents = events.filter(e => e.date === selectedDateStr);

  const addEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newEvent: CalendarEvent = {
      id: generateId(),
      title: fd.get("title") as string,
      description: fd.get("description") as string,
      category: fd.get("category") as CalendarEvent["category"],
      date: selectedDateStr,
      time: fd.get("time") as string,
      assignedTo: fd.get("assignedTo") as CalendarEvent["assignedTo"],
      priority: fd.get("priority") as CalendarEvent["priority"],
      repeat: "once",
      completed: false,
    };
    setEvents([...events, newEvent]);
    setShowAdd(false);
  };

  const deleteEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl font-bold text-foreground">{format(currentDate, "MMMM yyyy")}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span>♥</span> Our Love Timeline
            </p>
          </div>
          <button className="w-9 h-9 rounded-full bg-card shadow-card flex items-center justify-center">
            <Search size={16} className="text-foreground" />
          </button>
        </div>

        {/* View mode tabs */}
        <div className="flex gap-2 mt-4 mb-5">
          {(["day", "week", "month"] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === mode
                  ? "bg-[hsl(100,20%,72%)] text-foreground"
                  : "bg-card shadow-card text-muted-foreground"
              }`}
            >
              {viewMode === mode && <Check size={12} />}
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Horizontal date strip */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {days.map(day => {
            const isSelected = isSameDay(day, selectedDate);
            const hasEvents = events.some(e => e.date === format(day, "yyyy-MM-dd"));
            return (
              <button
                key={day.toISOString()}
                onClick={() => { setSelectedDate(day); setCurrentDate(day); }}
                className={`flex flex-col items-center min-w-[52px] py-2.5 px-2 rounded-2xl transition-all ${
                  isSelected
                    ? "bg-[hsl(100,20%,72%)] shadow-soft"
                    : isToday(day) ? "bg-card shadow-card" : ""
                }`}
              >
                <span className={`text-[10px] font-medium mb-1 ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                  {format(day, "EEE")}
                </span>
                <span className={`text-base font-bold ${isSelected ? "text-foreground" : "text-foreground"}`}>
                  {format(day, "d")}
                </span>
                {hasEvents && !isSelected && <div className="w-1 h-1 rounded-full bg-primary mt-1" />}
              </button>
            );
          })}
        </div>

        {/* Today's Schedule */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-foreground">Today's Schedule</h2>
          <button className="text-sm text-muted-foreground font-medium">See all</button>
        </div>

        {dayEvents.length === 0 ? (
          <div className="space-y-4">
            {/* Empty state placeholder events */}
            <EventCard icon={Coffee} iconBg="bg-primary/15" title="Morning Coffee Date" time="08:30 AM" badge="Romance" onDelete={() => {}} />
            <EventCard icon={ShoppingCart} iconBg="bg-success/15" title="Weekly Grocery Run" time="05:00 PM" badge="Household" onDelete={() => {}} />
            <EventCard icon={Tv} iconBg="bg-accent/15" title="Netflix & Chill Night" time="08:00 PM" badge="Relax" onDelete={() => {}} />
          </div>
        ) : (
          <div className="space-y-3">
            {dayEvents.map(event => {
              const IconComp = CATEGORY_ICONS[event.category] || Coffee;
              const iconBg = CATEGORY_ICON_BG[event.category] || "bg-muted";
              return (
                <EventCard
                  key={event.id}
                  icon={IconComp}
                  iconBg={iconBg}
                  title={event.title}
                  time={event.time || "All day"}
                  badge={CATEGORY_LABEL[event.category] || event.category}
                  onDelete={() => deleteEvent(event.id)}
                />
              );
            })}
          </div>
        )}

        {/* Plan something special */}
        <div className="bg-card rounded-2xl p-6 shadow-card text-center mt-5 border border-border">
          <CalendarPlus size={28} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-bold text-foreground mb-1">Plan something special</p>
          <p className="text-xs text-muted-foreground mb-3">Add a surprise date or a reminder for your partner.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-5 py-2 rounded-full bg-foreground text-background text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Add Event
          </button>
        </div>

        {/* Anniversary teaser */}
        <div className="bg-[hsl(38,40%,88%)] rounded-2xl px-4 py-3.5 mt-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[hsl(38,40%,78%)] flex items-center justify-center shrink-0">
            <Cake size={18} className="text-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Anniversary in 12 days</p>
            <p className="text-xs text-muted-foreground">3 years of beautiful memories together</p>
          </div>
          <span className="text-muted-foreground">›</span>
        </div>

        {/* New Event FAB */}
        <div className="flex justify-end mt-5">
          <button
            onClick={() => setShowAdd(true)}
            className="bg-foreground text-background px-5 py-3 rounded-full flex items-center gap-2 shadow-elevated text-sm font-semibold"
          >
            <Plus size={16} /> New Event
          </button>
        </div>

        {/* Add Event Modal */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/30 z-50 flex items-end justify-center"
              onClick={() => setShowAdd(false)}
            >
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className="bg-card w-full max-w-lg rounded-t-2xl p-5 shadow-elevated"
              >
                <h3 className="text-lg font-bold text-foreground mb-4">New Event</h3>
                <form onSubmit={addEvent} className="space-y-3">
                  <input name="title" required placeholder="Event title" className="w-full h-11 px-4 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <input name="description" placeholder="Description (optional)" className="w-full h-11 px-4 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <div className="grid grid-cols-2 gap-3">
                    <input name="time" type="time" className="h-11 px-4 rounded-xl bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                    <select name="category" className="h-11 px-4 rounded-xl bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.replace("-", " ")}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select name="assignedTo" className="h-11 px-4 rounded-xl bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="both">Both</option>
                      <option value="partner1">Me</option>
                      <option value="partner2">Partner</option>
                    </select>
                    <select name="priority" className="h-11 px-4 rounded-xl bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full h-12 rounded-xl love-gradient text-primary-foreground font-semibold text-sm shadow-soft">
                    Add Event
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

function EventCard({ icon: Icon, iconBg, title, time, badge, onDelete }: {
  icon: any; iconBg: string; title: string; time: string; badge: string; onDelete: () => void;
}) {
  return (
    <div className="bg-card rounded-2xl px-4 py-3.5 shadow-card flex items-center gap-3 border border-border">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon size={18} className="text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">⏱ {time}</p>
      </div>
      <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">{badge}</span>
    </div>
  );
}
