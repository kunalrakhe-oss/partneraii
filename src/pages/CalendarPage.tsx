import { useState, useEffect } from "react";
import {
  format, addDays, subDays, startOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday, isSameMonth, addMonths, subMonths,
} from "date-fns";
import {
  Plus, X, Check, Coffee, ShoppingCart, Tv, Cake, CalendarPlus,
  ChevronLeft, ChevronRight, Clock, Tag, Users, Flag, Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CATEGORIES = ["date-night", "groceries", "cleaning", "bills", "travel", "family"] as const;
const CATEGORY_ICONS: Record<string, any> = {
  "date-night": Coffee, groceries: ShoppingCart, cleaning: Tv,
  travel: Cake, family: Users, bills: Tag,
};
const CATEGORY_ICON_BG: Record<string, string> = {
  "date-night": "bg-secondary/20", groceries: "bg-success/20", cleaning: "bg-accent/30",
  travel: "bg-warning/20", family: "bg-primary/20", bills: "bg-muted",
};
const CATEGORY_LABEL: Record<string, string> = {
  "date-night": "Romance", groceries: "Household", cleaning: "Cleaning",
  bills: "Bills", travel: "Travel", family: "Family",
};

type ViewMode = "day" | "week" | "month";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  category: string;
  event_date: string;
  event_time: string | null;
  assigned_to: string;
  priority: string;
  recurrence: string;
  is_completed: boolean;
  user_id: string;
  partner_pair: string;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const { partnerPair, loading: ppLoading } = usePartnerPair();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formCategory, setFormCategory] = useState<string>("date-night");
  const [formAssigned, setFormAssigned] = useState("both");
  const [formPriority, setFormPriority] = useState("medium");
  const [formDate, setFormDate] = useState("");

  useEffect(() => {
    if (!partnerPair) return;
    supabase
      .from("calendar_events")
      .select("*")
      .eq("partner_pair", partnerPair)
      .then(({ data }) => {
        if (data) setEvents(data);
      });
  }, [partnerPair]);

  // Date helpers
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  const getVisibleEvents = () => {
    if (viewMode === "day") {
      return events.filter((e) => e.event_date === selectedDateStr);
    }
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      return events.filter((e) => {
        const d = new Date(e.event_date);
        return d >= ws && d <= we;
      });
    }
    // month
    const ms = startOfMonth(currentDate);
    const me = endOfMonth(currentDate);
    return events.filter((e) => {
      const d = new Date(e.event_date);
      return d >= ms && d <= me;
    });
  };

  const dayEvents = events.filter((e) => e.event_date === selectedDateStr);
  const visibleEvents = getVisibleEvents();

  // Week strip
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  // Month grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthGridEnd = addDays(startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 1 }), -1);
  const monthDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd > monthEnd ? monthGridEnd : addDays(monthEnd, 6 - monthEnd.getDay()) });
  // Ensure we get full weeks
  const fullMonthDays = eachDayOfInterval({
    start: monthGridStart,
    end: addDays(monthGridStart, Math.ceil((monthEnd.getTime() - monthGridStart.getTime()) / 86400000 / 7) * 7 - 1),
  });

  const navigatePrev = () => {
    if (viewMode === "day") setCurrentDate((d) => subDays(d, 1));
    else if (viewMode === "week") setCurrentDate((d) => subDays(d, 7));
    else setCurrentDate((d) => subMonths(d, 1));
  };

  const navigateNext = () => {
    if (viewMode === "day") setCurrentDate((d) => addDays(d, 1));
    else if (viewMode === "week") setCurrentDate((d) => addDays(d, 7));
    else setCurrentDate((d) => addMonths(d, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const openAddForm = (date?: Date) => {
    setEditingEvent(null);
    setFormTitle("");
    setFormDesc("");
    setFormTime("");
    setFormCategory("date-night");
    setFormAssigned("both");
    setFormPriority("medium");
    setFormDate(format(date || selectedDate, "yyyy-MM-dd"));
    setShowAdd(true);
  };

  const openEditForm = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormDesc(event.description || "");
    setFormTime(event.event_time || "");
    setFormCategory(event.category);
    setFormAssigned(event.assigned_to);
    setFormPriority(event.priority);
    setFormDate(event.event_date);
    setShowAdd(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !partnerPair || !formTitle.trim()) return;

    if (editingEvent) {
      const { data, error } = await supabase
        .from("calendar_events")
        .update({
          title: formTitle.trim(),
          description: formDesc.trim() || null,
          event_time: formTime || null,
          category: formCategory,
          assigned_to: formAssigned,
          priority: formPriority,
          event_date: formDate,
        })
        .eq("id", editingEvent.id)
        .select()
        .single();
      if (error) {
        toast.error("Failed to update event");
        return;
      }
      setEvents((prev) => prev.map((ev) => (ev.id === editingEvent.id ? data : ev)));
      toast.success("Event updated ✨");
    } else {
      const { data, error } = await supabase
        .from("calendar_events")
        .insert({
          title: formTitle.trim(),
          description: formDesc.trim() || null,
          category: formCategory,
          event_date: formDate,
          event_time: formTime || null,
          assigned_to: formAssigned,
          priority: formPriority,
          recurrence: "once",
          user_id: user.id,
          partner_pair: partnerPair,
        })
        .select()
        .single();
      if (error) {
        toast.error("Failed to add event");
        return;
      }
      setEvents((prev) => [...prev, data]);
      toast.success("Event added 🎉");
    }
    setShowAdd(false);
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast.success("Event removed");
  };

  const toggleComplete = async (event: CalendarEvent) => {
    const { data, error } = await supabase
      .from("calendar_events")
      .update({ is_completed: !event.is_completed })
      .eq("id", event.id)
      .select()
      .single();
    if (error) return;
    setEvents((prev) => prev.map((ev) => (ev.id === event.id ? data : ev)));
  };

  if (ppLoading)
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </PageTransition>
    );

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {format(currentDate, "MMMM yyyy")}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span>♥</span> Our Love Timeline
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-btn"
            >
              Today
            </button>
            <div className="flex gap-1">
              <button
                onClick={navigatePrev}
                className="w-8 h-8 rounded-full bg-card shadow-card flex items-center justify-center"
              >
                <ChevronLeft size={16} className="text-foreground" />
              </button>
              <button
                onClick={navigateNext}
                className="w-8 h-8 rounded-full bg-card shadow-card flex items-center justify-center"
              >
                <ChevronRight size={16} className="text-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* View mode tabs */}
        <div className="flex gap-2 mb-5">
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1.5 rounded-btn text-xs font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === mode
                  ? "love-gradient text-primary-foreground"
                  : "bg-card shadow-card text-muted-foreground"
              }`}
            >
              {viewMode === mode && <Check size={12} />}
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Month grid view */}
        {viewMode === "month" && (
          <div className="mb-5">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {fullMonthDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const hasEvt = events.some((e) => e.event_date === dateStr);
                const isSelected = isSameDay(day, selectedDate);
                const inMonth = isSameMonth(day, currentDate);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`relative flex flex-col items-center py-1.5 rounded-xl text-xs transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold"
                        : isToday(day)
                        ? "bg-primary/15 text-foreground font-semibold"
                        : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/40"
                    }`}
                  >
                    {format(day, "d")}
                    {hasEvt && !isSelected && (
                      <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-secondary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Week strip view */}
        {viewMode === "week" && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {weekDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const dateStr = format(day, "yyyy-MM-dd");
              const hasEvt = events.some((e) => e.event_date === dateStr);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center min-w-[48px] py-2.5 px-2 rounded-2xl transition-all ${
                    isSelected
                      ? "love-gradient shadow-soft text-primary-foreground"
                      : isToday(day)
                      ? "bg-card shadow-card"
                      : ""
                  }`}
                >
                  <span
                    className={`text-[10px] font-medium mb-1 ${
                      isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {format(day, "EEE")}
                  </span>
                  <span
                    className={`text-base font-bold ${
                      isSelected ? "text-primary-foreground" : "text-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  {hasEvt && !isSelected && (
                    <div className="w-1 h-1 rounded-full bg-secondary mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Day view - just show the selected date header */}
        {viewMode === "day" && (
          <div className="mb-4">
            <p className="text-sm font-semibold text-foreground">
              {isToday(selectedDate)
                ? "Today"
                : format(selectedDate, "EEEE, MMMM d")}
            </p>
          </div>
        )}

        {/* Selected date events */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">
            {format(selectedDate, "EEEE, MMM d")}
          </h2>
          <span className="text-xs text-muted-foreground">
            {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
          </span>
        </div>

        {dayEvents.length === 0 ? (
          <div className="bg-card rounded-card p-6 shadow-card text-center border border-border">
            <CalendarPlus size={28} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground mb-1">No events planned</p>
            <p className="text-xs text-muted-foreground mb-3">
              Add a date, errand, or reminder for this day.
            </p>
            <button
              onClick={() => openAddForm()}
              className="px-5 py-2 rounded-btn love-gradient text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Event
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {dayEvents
              .sort((a, b) => (a.event_time || "").localeCompare(b.event_time || ""))
              .map((event) => {
                const IconComp = CATEGORY_ICONS[event.category] || Coffee;
                const iconBg = CATEGORY_ICON_BG[event.category] || "bg-muted";
                return (
                  <EventCard
                    key={event.id}
                    event={event}
                    icon={IconComp}
                    iconBg={iconBg}
                    badge={CATEGORY_LABEL[event.category] || event.category}
                    onToggle={() => toggleComplete(event)}
                    onEdit={() => openEditForm(event)}
                    onDelete={() => deleteEvent(event.id)}
                  />
                );
              })}
          </div>
        )}

        {/* Upcoming events (week/month views) */}
        {viewMode !== "day" && visibleEvents.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-bold text-foreground mb-3">
              All {viewMode === "week" ? "This Week" : "This Month"} ({visibleEvents.length})
            </h3>
            <div className="space-y-2">
              {visibleEvents
                .sort((a, b) => a.event_date.localeCompare(b.event_date) || (a.event_time || "").localeCompare(b.event_time || ""))
                .map((event) => {
                  const IconComp = CATEGORY_ICONS[event.category] || Coffee;
                  const iconBg = CATEGORY_ICON_BG[event.category] || "bg-muted";
                  return (
                    <EventCard
                      key={event.id}
                      event={event}
                      icon={IconComp}
                      iconBg={iconBg}
                      badge={CATEGORY_LABEL[event.category] || event.category}
                      showDate
                      onToggle={() => toggleComplete(event)}
                      onEdit={() => openEditForm(event)}
                      onDelete={() => deleteEvent(event.id)}
                    />
                  );
                })}
            </div>
          </div>
        )}

        {/* FAB */}
        <div className="flex justify-end mt-5">
          <button
            onClick={() => openAddForm()}
            className="love-gradient text-primary-foreground px-5 py-3 rounded-btn flex items-center gap-2 shadow-elevated text-sm font-semibold"
          >
            <Plus size={16} /> New Event
          </button>
        </div>

        {/* Add/Edit Event Modal */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/30 z-50 flex items-end justify-center"
              onClick={() => setShowAdd(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card w-full max-w-lg rounded-t-3xl p-5 shadow-elevated max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-foreground">
                    {editingEvent ? "Edit Event" : "New Event"}
                  </h3>
                  <button
                    onClick={() => setShowAdd(false)}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                  >
                    <X size={16} className="text-muted-foreground" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Title</label>
                    <input
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      required
                      placeholder="Event title"
                      className="w-full h-11 px-4 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Description</label>
                    <input
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Optional description"
                      className="w-full h-11 px-4 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Date</label>
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        required
                        className="w-full h-11 px-4 rounded-xl bg-muted text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Time</label>
                      <input
                        type="time"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl bg-muted text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Category</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFormCategory(c)}
                          className={`px-3 py-1.5 rounded-btn text-xs font-medium transition-colors ${
                            formCategory === c
                              ? "love-gradient text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {CATEGORY_LABEL[c]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Assign To</label>
                      <select
                        value={formAssigned}
                        onChange={(e) => setFormAssigned(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl bg-muted text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="both">Both</option>
                        <option value="me">Me</option>
                        <option value="partner">Partner</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Priority</label>
                      <select
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl bg-muted text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full h-12 rounded-btn love-gradient text-primary-foreground font-semibold text-sm shadow-soft mt-2"
                  >
                    {editingEvent ? "Save Changes" : "Add Event"}
                  </button>

                  {editingEvent && (
                    <button
                      type="button"
                      onClick={() => {
                        deleteEvent(editingEvent.id);
                        setShowAdd(false);
                      }}
                      className="w-full h-11 rounded-btn bg-destructive/10 text-destructive font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} /> Delete Event
                    </button>
                  )}
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

function EventCard({
  event,
  icon: Icon,
  iconBg,
  badge,
  showDate,
  onToggle,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent;
  icon: any;
  iconBg: string;
  badge: string;
  showDate?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const priorityColors: Record<string, string> = {
    high: "bg-destructive/15 text-destructive",
    medium: "bg-warning/15 text-warning",
    low: "bg-primary/15 text-primary",
  };

  return (
    <motion.div
      layout
      className={`bg-card rounded-card px-4 py-3.5 shadow-card flex items-center gap-3 border border-border transition-opacity ${
        event.is_completed ? "opacity-60" : ""
      }`}
    >
      {/* Complete toggle */}
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
          event.is_completed ? "bg-success border-success" : "border-border"
        }`}
      >
        {event.is_completed && <Check size={14} className="text-success-foreground" />}
      </button>

      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}
      >
        <Icon size={18} className="text-foreground" />
      </div>

      {/* Info */}
      <button onClick={onEdit} className="flex-1 min-w-0 text-left">
        <p
          className={`text-sm font-semibold ${
            event.is_completed ? "line-through text-muted-foreground" : "text-foreground"
          }`}
        >
          {event.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {event.event_time && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock size={9} /> {event.event_time}
            </span>
          )}
          {showDate && (
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(event.event_date), "MMM d")}
            </span>
          )}
          {event.assigned_to !== "both" && (
            <span className="text-[10px] text-muted-foreground capitalize">
              • {event.assigned_to}
            </span>
          )}
        </div>
      </button>

      {/* Badges */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[9px] px-2 py-0.5 rounded-btn bg-muted text-muted-foreground font-medium">
          {badge}
        </span>
        {event.priority !== "medium" && (
          <span
            className={`text-[9px] px-2 py-0.5 rounded-btn font-medium ${
              priorityColors[event.priority] || ""
            }`}
          >
            {event.priority}
          </span>
        )}
      </div>
    </motion.div>
  );
}
