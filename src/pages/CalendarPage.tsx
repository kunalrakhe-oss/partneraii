import { useState } from "react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalStorage, generateId, type CalendarEvent } from "@/lib/store";
import PageTransition from "@/components/PageTransition";

const CATEGORIES = ["date-night", "groceries", "cleaning", "bills", "travel", "family"] as const;

export default function CalendarPage() {
  const [events, setEvents] = useLocalStorage<CalendarEvent[]>("lovelist-events", []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const dayEvents = events.filter(e => e.date === selectedDateStr);

  const prevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));

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

  const toggleComplete = (id: string) => {
    setEvents(events.map(e => e.id === id ? { ...e, completed: !e.completed } : e));
  };

  const deleteEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">Calendar</h1>
          <button onClick={() => setShowAdd(true)} className="w-9 h-9 rounded-full love-gradient flex items-center justify-center shadow-soft">
            <Plus size={18} className="text-primary-foreground" />
          </button>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevWeek} className="p-1"><ChevronLeft size={18} className="text-muted-foreground" /></button>
          <span className="text-sm font-medium text-foreground">{format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}</span>
          <button onClick={nextWeek} className="p-1"><ChevronRight size={18} className="text-muted-foreground" /></button>
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-7 gap-1 mb-6">
          {days.map(day => {
            const isSelected = isSameDay(day, selectedDate);
            const hasEvents = events.some(e => e.date === format(day, "yyyy-MM-dd"));
            return (
              <button
                key={day.toISOString()}
                onClick={() => { setSelectedDate(day); setCurrentDate(day); }}
                className={`flex flex-col items-center py-2 rounded-xl transition-all ${
                  isSelected ? "love-gradient text-primary-foreground shadow-soft" :
                  isToday(day) ? "bg-secondary" : ""
                }`}
              >
                <span className={`text-[10px] font-medium mb-1 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {format(day, "EEE")}
                </span>
                <span className={`text-sm font-semibold ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
                  {format(day, "d")}
                </span>
                {hasEvents && !isSelected && <div className="w-1 h-1 rounded-full bg-primary mt-1" />}
              </button>
            );
          })}
        </div>

        {/* Events for selected day */}
        <h2 className="text-sm font-semibold text-foreground mb-3">{format(selectedDate, "EEEE, MMM d")}</h2>
        {dayEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No events for this day</p>
        ) : (
          <div className="space-y-2">
            {dayEvents.map(event => (
              <motion.div
                key={event.id}
                layout
                className={`bg-card rounded-xl px-4 py-3 shadow-card flex items-center gap-3 ${event.completed ? "opacity-50" : ""}`}
              >
                <button onClick={() => toggleComplete(event.id)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    event.completed ? "bg-primary border-primary" : "border-border"
                  }`}
                >
                  {event.completed && <span className="text-primary-foreground text-xs">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${event.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.time || "All day"} · {event.category}</p>
                </div>
                <button onClick={() => deleteEvent(event.id)} className="text-muted-foreground hover:text-destructive">
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        )}

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
                  <input name="title" required placeholder="Event title" className="w-full h-10 px-3 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <input name="description" placeholder="Description (optional)" className="w-full h-10 px-3 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <div className="grid grid-cols-2 gap-3">
                    <input name="time" type="time" className="h-10 px-3 rounded-lg bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                    <select name="category" className="h-10 px-3 rounded-lg bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.replace("-", " ")}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select name="assignedTo" className="h-10 px-3 rounded-lg bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="both">Both</option>
                      <option value="partner1">Me</option>
                      <option value="partner2">Partner</option>
                    </select>
                    <select name="priority" className="h-10 px-3 rounded-lg bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full h-11 rounded-xl love-gradient text-primary-foreground font-semibold text-sm shadow-soft">
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
