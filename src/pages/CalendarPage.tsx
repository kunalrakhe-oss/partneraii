import { useState, useEffect, useRef, useMemo } from "react";
import {
  format, addDays, subDays, startOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday, isSameMonth, addMonths, subMonths,
  isBefore, startOfDay, parseISO,
} from "date-fns";
import {
  Plus, X, Check, Coffee, ShoppingCart, Tv, Cake, CalendarPlus,
  ChevronLeft, ChevronRight, Clock, Tag, Users, Trash2,
  List, CalendarDays, Calendar, LayoutGrid,
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
const CATEGORY_COLORS: Record<string, string> = {
  "date-night": "bg-secondary/70", groceries: "bg-success/70", cleaning: "bg-accent",
  travel: "bg-warning/70", family: "bg-primary/70", bills: "bg-muted-foreground/50",
};
const CATEGORY_LABEL: Record<string, string> = {
  "date-night": "Romance", groceries: "Household", cleaning: "Cleaning",
  bills: "Bills", travel: "Travel", family: "Family",
};

type ViewMode = "day" | "multiday" | "month" | "list";

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

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function timeToMinutes(time: string | null): number {
  if (!time) return -1;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const { partnerPair, loading: ppLoading } = usePartnerPair();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
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

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const dayEvents = events.filter((e) => e.event_date === selectedDateStr);

  const navigatePrev = () => {
    if (viewMode === "day") { setCurrentDate((d) => subDays(d, 1)); setSelectedDate((d) => subDays(d, 1)); }
    else if (viewMode === "multiday") { setCurrentDate((d) => subDays(d, 3)); setSelectedDate((d) => subDays(d, 3)); }
    else setCurrentDate((d) => subMonths(d, 1));
  };

  const navigateNext = () => {
    if (viewMode === "day") { setCurrentDate((d) => addDays(d, 1)); setSelectedDate((d) => addDays(d, 1)); }
    else if (viewMode === "multiday") { setCurrentDate((d) => addDays(d, 3)); setSelectedDate((d) => addDays(d, 3)); }
    else setCurrentDate((d) => addMonths(d, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const openAddForm = (date?: Date, time?: string) => {
    setEditingEvent(null);
    setFormTitle("");
    setFormDesc("");
    setFormTime(time || "");
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
      if (error) { toast.error("Failed to update event"); return; }
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
      if (error) { toast.error("Failed to add event"); return; }
      setEvents((prev) => [...prev, data]);
      toast.success("Event added 🎉");
    }
    setShowAdd(false);
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
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

  const viewIcons: { mode: ViewMode; icon: any; label: string }[] = [
    { mode: "day", icon: Calendar, label: "Day" },
    { mode: "multiday", icon: CalendarDays, label: "3 Day" },
    { mode: "month", icon: LayoutGrid, label: "Month" },
    { mode: "list", icon: List, label: "List" },
  ];

  return (
    <PageTransition>
      <div className="flex flex-col h-full">
        {/* Sticky header */}
        <div className="px-5 pt-10 pb-3 bg-background">
          {/* Title row */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={goToToday} className="text-left">
              <h1 className="text-xl font-bold text-foreground">
                {viewMode === "day" || viewMode === "multiday"
                  ? format(selectedDate, "MMMM d, yyyy")
                  : format(currentDate, "MMMM yyyy")}
              </h1>
              <p className="text-[10px] text-primary font-semibold uppercase tracking-wider">
                {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE")}
              </p>
            </button>
            <div className="flex items-center gap-1.5">
              <button onClick={navigatePrev} className="w-8 h-8 rounded-full bg-card shadow-soft flex items-center justify-center">
                <ChevronLeft size={16} className="text-foreground" />
              </button>
              <button onClick={navigateNext} className="w-8 h-8 rounded-full bg-card shadow-soft flex items-center justify-center">
                <ChevronRight size={16} className="text-foreground" />
              </button>
            </div>
          </div>

          {/* View mode segmented control — Apple style */}
          <div className="flex bg-muted rounded-xl p-0.5">
            {viewIcons.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-xs font-semibold transition-all ${
                  viewMode === mode
                    ? "bg-card shadow-soft text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {viewMode === "day" && (
            <DayView
              date={selectedDate}
              events={dayEvents}
              onAddEvent={(time) => openAddForm(selectedDate, time)}
              onEditEvent={openEditForm}
              onToggle={toggleComplete}
            />
          )}

          {viewMode === "multiday" && (
            <MultiDayView
              startDate={selectedDate}
              events={events}
              onSelectDate={(d) => { setSelectedDate(d); setViewMode("day"); }}
              onAddEvent={(d, t) => openAddForm(d, t)}
              onEditEvent={openEditForm}
              onToggle={toggleComplete}
            />
          )}

          {viewMode === "month" && (
            <MonthView
              currentDate={currentDate}
              selectedDate={selectedDate}
              events={events}
              onSelectDate={(d) => setSelectedDate(d)}
              onEditEvent={openEditForm}
              onToggle={toggleComplete}
              onAddEvent={() => openAddForm()}
            />
          )}

          {viewMode === "list" && (
            <ListView
              events={events}
              onEditEvent={openEditForm}
              onToggle={toggleComplete}
              onAddEvent={() => openAddForm()}
            />
          )}
        </div>

        {/* FAB */}
        <button
          onClick={() => openAddForm()}
          className="fixed bottom-20 right-5 max-w-lg love-gradient text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center shadow-elevated z-40"
        >
          <Plus size={22} />
        </button>

        {/* Add/Edit Event Modal */}
        <AddEventModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          editingEvent={editingEvent}
          defaultDate={selectedDate}
          defaultTime={formTime}
          onEventSaved={(data) => {
            if (editingEvent) {
              setEvents((prev) => prev.map((ev) => (ev.id === editingEvent.id ? data : ev)));
            } else {
              setEvents((prev) => [...prev, data]);
            }
          }}
          onEventDeleted={(id) => {
            setEvents((prev) => prev.filter((e) => e.id !== id));
          }}
        />
      </div>
    </PageTransition>
  );
}

/* ─────────────── DAY VIEW (Apple-style time grid) ─────────────── */

function DayView({ date, events, onAddEvent, onEditEvent, onToggle }: {
  date: Date;
  events: CalendarEvent[];
  onAddEvent: (time?: string) => void;
  onEditEvent: (e: CalendarEvent) => void;
  onToggle: (e: CalendarEvent) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowHour = new Date().getHours();

  useEffect(() => {
    if (scrollRef.current) {
      // Scroll to current hour - 2
      const target = Math.max(0, nowHour - 2) * 60;
      scrollRef.current.scrollTop = target;
    }
  }, []);

  // All-day events (no time)
  const allDayEvents = events.filter((e) => !e.event_time);
  const timedEvents = events.filter((e) => e.event_time);

  return (
    <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="px-5 py-2 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">All Day</p>
          {allDayEvents.map((evt) => (
            <button key={evt.id} onClick={() => onEditEvent(evt)}
              className={`w-full text-left px-3 py-1.5 rounded-lg mb-1 text-xs font-medium ${CATEGORY_COLORS[evt.category] || "bg-primary/50"} text-primary-foreground ${evt.is_completed ? "opacity-50 line-through" : ""}`}>
              {evt.title}
            </button>
          ))}
        </div>
      )}

      {/* Time grid */}
      <div className="relative">
        {/* Current time indicator */}
        {isToday(date) && (
          <div
            className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
            style={{ top: `${(nowHour * 60 + new Date().getMinutes()) * (60 / 60)}px` }}
          >
            <div className="w-2 h-2 rounded-full bg-destructive ml-[54px]" />
            <div className="flex-1 h-[1.5px] bg-destructive" />
          </div>
        )}

        {HOURS.map((hour) => {
          const hourEvents = timedEvents.filter((e) => {
            const m = timeToMinutes(e.event_time);
            return m >= hour * 60 && m < (hour + 1) * 60;
          });

          return (
            <div
              key={hour}
              className="flex border-b border-border/50 min-h-[60px] cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => onAddEvent(`${hour.toString().padStart(2, "0")}:00`)}
            >
              {/* Time label */}
              <div className="w-14 shrink-0 pr-2 pt-0.5 text-right">
                <span className="text-[10px] text-muted-foreground font-medium">{formatHour(hour)}</span>
              </div>

              {/* Events */}
              <div className="flex-1 relative border-l border-border/50 pl-2 py-0.5">
                {hourEvents.map((evt) => (
                  <button
                    key={evt.id}
                    onClick={(e) => { e.stopPropagation(); onEditEvent(evt); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg mb-0.5 text-xs font-medium border-l-[3px] ${
                      evt.is_completed ? "opacity-50" : ""
                    }`}
                    style={{
                      backgroundColor: `hsl(var(--${evt.category === "date-night" ? "secondary" : evt.category === "groceries" ? "success" : "primary"}) / 0.15)`,
                      borderLeftColor: `hsl(var(--${evt.category === "date-night" ? "secondary" : evt.category === "groceries" ? "success" : "primary"}))`,
                    }}
                  >
                    <span className={`text-foreground ${evt.is_completed ? "line-through" : ""}`}>{evt.title}</span>
                    <span className="text-muted-foreground ml-1">{evt.event_time}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────── MULTI-DAY VIEW (3-day Apple style) ─────────────── */

function MultiDayView({ startDate, events, onSelectDate, onAddEvent, onEditEvent, onToggle }: {
  startDate: Date;
  events: CalendarEvent[];
  onSelectDate: (d: Date) => void;
  onAddEvent: (d: Date, t?: string) => void;
  onEditEvent: (e: CalendarEvent) => void;
  onToggle: (e: CalendarEvent) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const days = [startDate, addDays(startDate, 1), addDays(startDate, 2)];
  const nowHour = new Date().getHours();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, nowHour - 2) * 60;
    }
  }, []);

  return (
    <div>
      {/* Day headers */}
      <div className="flex border-b border-border sticky top-0 bg-background z-10">
        <div className="w-12 shrink-0" />
        {days.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => onSelectDate(day)}
            className={`flex-1 text-center py-2 ${isToday(day) ? "bg-primary/10" : ""}`}
          >
            <p className="text-[10px] text-muted-foreground font-medium">{format(day, "EEE")}</p>
            <p className={`text-base font-bold ${isToday(day) ? "text-primary" : "text-foreground"}`}>
              {format(day, "d")}
            </p>
          </button>
        ))}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 250px)" }}>
        {HOURS.map((hour) => (
          <div key={hour} className="flex min-h-[52px] border-b border-border/30">
            {/* Time label */}
            <div className="w-12 shrink-0 pr-1 pt-0.5 text-right">
              <span className="text-[9px] text-muted-foreground">{formatHour(hour)}</span>
            </div>

            {/* Columns for each day */}
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const hourEvents = events.filter((e) => {
                if (e.event_date !== dateStr) return false;
                const m = timeToMinutes(e.event_time);
                return m >= hour * 60 && m < (hour + 1) * 60;
              });

              return (
                <div
                  key={day.toISOString()}
                  className={`flex-1 border-l border-border/30 px-0.5 py-0.5 cursor-pointer hover:bg-muted/20 transition-colors ${
                    isToday(day) ? "bg-primary/[0.03]" : ""
                  }`}
                  onClick={() => onAddEvent(day, `${hour.toString().padStart(2, "0")}:00`)}
                >
                  {hourEvents.map((evt) => (
                    <button
                      key={evt.id}
                      onClick={(e) => { e.stopPropagation(); onEditEvent(evt); }}
                      className={`w-full text-left px-1 py-0.5 rounded text-[9px] font-medium leading-tight truncate ${
                        CATEGORY_COLORS[evt.category] || "bg-primary/50"
                      } text-primary-foreground ${evt.is_completed ? "opacity-50" : ""}`}
                    >
                      {evt.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── MONTH VIEW (Apple-style grid + event list) ─────────────── */

function MonthView({ currentDate, selectedDate, events, onSelectDate, onEditEvent, onToggle, onAddEvent }: {
  currentDate: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  onSelectDate: (d: Date) => void;
  onEditEvent: (e: CalendarEvent) => void;
  onToggle: (e: CalendarEvent) => void;
  onAddEvent: () => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const totalDays = Math.ceil((monthEnd.getTime() - gridStart.getTime()) / 86400000 / 7) * 7;
  const allDays = eachDayOfInterval({ start: gridStart, end: addDays(gridStart, totalDays - 1) });

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const selectedEvents = events
    .filter((e) => e.event_date === selectedDateStr)
    .sort((a, b) => (a.event_time || "").localeCompare(b.event_time || ""));

  return (
    <div className="px-5">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-2">{d}</div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {allDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayEvts = events.filter((e) => e.event_date === dateStr);
          const isSelected = isSameDay(day, selectedDate);
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className="flex flex-col items-center py-1 relative"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : today
                  ? "bg-primary/15 text-primary font-bold"
                  : inMonth
                  ? "text-foreground"
                  : "text-muted-foreground/30"
              }`}>
                {format(day, "d")}
              </div>
              {/* Event dots */}
              {dayEvts.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvts.slice(0, 3).map((evt, i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full ${
                        evt.category === "date-night" ? "bg-secondary" :
                        evt.category === "groceries" ? "bg-success" :
                        "bg-primary"
                      }`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day events */}
      <div className="mt-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            {isToday(selectedDate) ? "Today" : format(selectedDate, "EEE, MMM d")}
          </h3>
          <span className="text-[10px] text-muted-foreground">{selectedEvents.length} events</span>
        </div>

        {selectedEvents.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground mb-2">No events</p>
            <button onClick={onAddEvent} className="text-xs text-primary font-semibold">+ Add Event</button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {selectedEvents.map((evt) => (
              <button
                key={evt.id}
                onClick={() => onEditEvent(evt)}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card shadow-soft border border-border ${evt.is_completed ? "opacity-50" : ""}`}
              >
                <div className={`w-1 self-stretch rounded-full ${CATEGORY_COLORS[evt.category] || "bg-primary/50"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold text-foreground ${evt.is_completed ? "line-through" : ""}`}>
                    {evt.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {evt.event_time || "All day"} • {CATEGORY_LABEL[evt.category] || evt.category}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggle(evt); }}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    evt.is_completed ? "bg-success border-success" : "border-border"
                  }`}
                >
                  {evt.is_completed && <Check size={10} className="text-success-foreground" />}
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── LIST VIEW (Upcoming chronological) ─────────────── */

function ListView({ events, onEditEvent, onToggle, onAddEvent }: {
  events: CalendarEvent[];
  onEditEvent: (e: CalendarEvent) => void;
  onToggle: (e: CalendarEvent) => void;
  onAddEvent: () => void;
}) {
  const today = startOfDay(new Date());

  // Group by date, sorted, show past 7 days + future
  const grouped = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => a.event_date.localeCompare(b.event_date) || (a.event_time || "").localeCompare(b.event_time || "")
    );

    const minDate = format(subDays(today, 7), "yyyy-MM-dd");
    const filtered = sorted.filter((e) => e.event_date >= minDate);

    const groups: { date: string; events: CalendarEvent[] }[] = [];
    for (const evt of filtered) {
      const last = groups[groups.length - 1];
      if (last && last.date === evt.event_date) {
        last.events.push(evt);
      } else {
        groups.push({ date: evt.event_date, events: [evt] });
      }
    }
    return groups;
  }, [events]);

  if (grouped.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <CalendarPlus size={32} className="text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-semibold text-foreground mb-1">No upcoming events</p>
        <p className="text-xs text-muted-foreground mb-4">Plan something together!</p>
        <button onClick={onAddEvent} className="px-5 py-2.5 rounded-btn love-gradient text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5">
          <Plus size={14} /> Add Event
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 pb-6">
      {grouped.map(({ date, events: dayEvts }) => {
        const d = parseISO(date);
        const isPast = isBefore(d, today);
        const todaySection = isToday(d);

        return (
          <div key={date} className={`${isPast && !todaySection ? "opacity-50" : ""}`}>
            {/* Date header — sticky Apple style */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 flex items-center gap-3 py-2.5">
              <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center ${
                todaySection ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                <span className="text-[9px] font-bold leading-none uppercase">
                  {format(d, "EEE")}
                </span>
                <span className="text-sm font-bold leading-none">{format(d, "d")}</span>
              </div>
              <div>
                <p className={`text-sm font-bold ${todaySection ? "text-primary" : "text-foreground"}`}>
                  {todaySection ? "Today" : format(d, "EEEE")}
                </p>
                <p className="text-[10px] text-muted-foreground">{format(d, "MMMM yyyy")}</p>
              </div>
            </div>

            {/* Events */}
            <div className="ml-5 pl-7 border-l-2 border-border space-y-1.5 pb-3">
              {dayEvts.map((evt) => (
                <button
                  key={evt.id}
                  onClick={() => onEditEvent(evt)}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card shadow-soft border border-border ${evt.is_completed ? "opacity-50" : ""}`}
                >
                  <div className={`w-1 self-stretch rounded-full ${CATEGORY_COLORS[evt.category] || "bg-primary/50"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold text-foreground ${evt.is_completed ? "line-through" : ""}`}>
                      {evt.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {evt.event_time || "All day"} • {CATEGORY_LABEL[evt.category] || evt.category}
                      {evt.assigned_to !== "both" ? ` • ${evt.assigned_to}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggle(evt); }}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      evt.is_completed ? "bg-success border-success" : "border-border"
                    }`}
                  >
                    {evt.is_completed && <Check size={10} className="text-success-foreground" />}
                  </button>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
