import { useState, useEffect, useRef, useMemo } from "react";
import {
  format, addDays, subDays, startOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday, isSameMonth, addMonths, subMonths,
  isBefore, startOfDay, parseISO,
} from "date-fns";
import {
  Plus, X, Check, Coffee, ShoppingCart, Tv, Cake, CalendarPlus,
  ChevronLeft, ChevronRight, Clock, Tag, Users, Trash2,
  List, CalendarDays, Calendar, LayoutGrid, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProfileButton from "@/components/ProfileButton";
import AddEventModal from "@/components/AddEventModal";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CATEGORIES = ["date-night", "groceries", "cleaning", "bills", "travel", "family", "chore", "reminder", "birthday", "grocery-due"] as const;
const CATEGORY_ICONS: Record<string, any> = {
  "date-night": Coffee, groceries: ShoppingCart, cleaning: Tv,
  travel: Cake, family: Users, bills: Tag,
  chore: Tv, reminder: Clock, birthday: Cake, "grocery-due": ShoppingCart,
};
const CATEGORY_COLORS: Record<string, string> = {
  "date-night": "bg-secondary/70", groceries: "bg-success/70", cleaning: "bg-accent",
  travel: "bg-warning/70", family: "bg-primary/70", bills: "bg-muted-foreground/50",
  chore: "bg-orange-400/70", reminder: "bg-blue-400/70", birthday: "bg-pink-400/70", "grocery-due": "bg-emerald-400/70",
};
const CATEGORY_LABEL: Record<string, string> = {
  "date-night": "Romance", groceries: "Household", cleaning: "Cleaning",
  bills: "Bills", travel: "Travel", family: "Family",
  chore: "Chore", reminder: "Reminder", birthday: "Birthday", "grocery-due": "Shopping",
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
  reminder?: string;
  countdown_type?: string;
  _source?: "chore" | "grocery"; // undefined = calendar_events
  _sourceId?: string;
}

function countdownBadge(event: CalendarEvent): string | null {
  if (!event.countdown_type || event.countdown_type === "none") return null;
  const today = startOfDay(new Date());
  const eventDay = startOfDay(parseISO(event.event_date));
  const diff = Math.round((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (event.countdown_type === "days-until") {
    if (diff === 0) return "Today!";
    if (diff === 1) return "Tomorrow!";
    if (diff > 0) return `${diff}d until`;
    return `${Math.abs(diff)}d ago`;
  }
  if (event.countdown_type === "days-since") {
    if (diff === 0) return "Today!";
    if (diff < 0) return `${Math.abs(diff)}d since`;
    return `In ${diff}d`;
  }
  return null;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_HEIGHT = 60; // 60px per hour = 1px per minute

function timeToMinutes(time: string | null): number {
  if (!time) return -1;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function snapTo15(minutes: number): number {
  return Math.round(minutes / 15) * 15;
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
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showViewMenu, setShowViewMenu] = useState(false);

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

    // Fetch calendar events, ALL chores, and grocery items with due dates in parallel
    Promise.all([
      supabase.from("calendar_events").select("*").eq("partner_pair", partnerPair),
      supabase.from("chores").select("*").eq("partner_pair", partnerPair),
      supabase.from("grocery_items").select("*").eq("partner_pair", partnerPair).not("due_date", "is", null),
    ]).then(([eventsRes, choresRes, groceryRes]) => {
      const calEvents: CalendarEvent[] = eventsRes.data || [];

      // Convert chores to calendar events — use due_date if set, otherwise created_at date
      const choreEvents: CalendarEvent[] = (choresRes.data || []).map((chore: any) => ({
        id: `chore-${chore.id}`,
        title: `🧹 ${chore.title}`,
        description: chore.recurrence ? `Repeats ${chore.recurrence}` : null,
        category: "chore",
        event_date: chore.due_date || chore.created_at.split("T")[0],
        event_time: null,
        assigned_to: chore.assigned_to ? "assigned" : "both",
        priority: "medium",
        recurrence: chore.recurrence || "once",
        is_completed: chore.is_completed,
        user_id: chore.user_id,
        partner_pair: chore.partner_pair,
        _source: "chore",
        _sourceId: chore.id,
      }));

      // Convert grocery items to calendar events
      const groceryEvents: CalendarEvent[] = (groceryRes.data || []).map((item: any) => ({
        id: `grocery-${item.id}`,
        title: `🛒 ${item.name}`,
        description: item.notes || null,
        category: "grocery-due",
        event_date: item.due_date,
        event_time: null,
        assigned_to: "both",
        priority: item.priority || "none",
        recurrence: "once",
        is_completed: item.is_checked,
        user_id: item.user_id,
        partner_pair: item.partner_pair,
        _source: "grocery",
        _sourceId: item.id,
      }));

      setEvents([...calEvents, ...choreEvents, ...groceryEvents]);
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
    // Chore/grocery items are view-only on calendar — just toggle completion
    if (event._source === "chore" || event._source === "grocery") {
      toast.info(`${event._source === "chore" ? "Chore" : "Grocery item"} — tap ✓ to toggle completion`);
      return;
    }
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
    if (event._source === "chore") {
      await supabase.from("chores").update({ is_completed: !event.is_completed }).eq("id", event._sourceId!);
      setEvents((prev) => prev.map((ev) => (ev.id === event.id ? { ...ev, is_completed: !ev.is_completed } : ev)));
      return;
    }
    if (event._source === "grocery") {
      await supabase.from("grocery_items").update({ is_checked: !event.is_completed }).eq("id", event._sourceId!);
      setEvents((prev) => prev.map((ev) => (ev.id === event.id ? { ...ev, is_completed: !ev.is_completed } : ev)));
      return;
    }
    const { data, error } = await supabase
      .from("calendar_events")
      .update({ is_completed: !event.is_completed })
      .eq("id", event.id)
      .select()
      .single();
    if (error) return;
    setEvents((prev) => prev.map((ev) => (ev.id === event.id ? data : ev)));
  };

  // Schedule/reschedule an item to a specific time slot (15-min granularity)
  const scheduleItem = async (event: CalendarEvent, time: string, targetDate?: string) => {
    const newDate = targetDate || event.event_date;
    if (event._source === "chore") {
      if (!user || !partnerPair) return;
      const { data, error } = await supabase
        .from("calendar_events")
        .insert({
          title: event.title,
          description: event.description,
          category: "chore",
          event_date: newDate,
          event_time: time,
          assigned_to: event.assigned_to,
          priority: event.priority,
          recurrence: "once",
          user_id: user.id,
          partner_pair: partnerPair,
        })
        .select()
        .single();
      if (error) { toast.error("Failed to schedule"); return; }
      setEvents((prev) => [...prev.filter((e) => e.id !== event.id), data]);
      toast.success(`Scheduled at ${time} ⏰`);
      return;
    }
    if (event._source === "grocery") {
      if (!user || !partnerPair) return;
      const { data, error } = await supabase
        .from("calendar_events")
        .insert({
          title: event.title,
          description: event.description,
          category: "grocery-due",
          event_date: newDate,
          event_time: time,
          assigned_to: "both",
          priority: event.priority,
          recurrence: "once",
          user_id: user.id,
          partner_pair: partnerPair,
        })
        .select()
        .single();
      if (error) { toast.error("Failed to schedule"); return; }
      setEvents((prev) => [...prev.filter((e) => e.id !== event.id), data]);
      toast.success(`Scheduled at ${time} ⏰`);
      return;
    }
    // Regular calendar event — update time (and optionally date)
    const updatePayload: any = { event_time: time };
    if (targetDate) updatePayload.event_date = targetDate;
    const { data, error } = await supabase
      .from("calendar_events")
      .update(updatePayload)
      .eq("id", event.id)
      .select()
      .single();
    if (error) { toast.error("Failed to reschedule"); return; }
    setEvents((prev) => prev.map((ev) => (ev.id === event.id ? data : ev)));
    toast.success(`Moved to ${time} ⏰`);
  };
  if (ppLoading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </PageTransition>
    );
  }

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
          {/* Title row with inline view picker — Apple Calendar style */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={navigatePrev} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button onClick={goToToday} className="text-left">
                <h1 className="text-lg font-bold text-foreground leading-tight">
                  {viewMode === "day" || viewMode === "multiday"
                    ? format(selectedDate, "MMM d, yyyy")
                    : format(currentDate, "MMMM yyyy")}
                </h1>
              </button>
              <button onClick={navigateNext} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Collapsed view picker dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowViewMenu(prev => !prev)}
                className="flex items-center gap-1 bg-muted rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground"
              >
                {viewIcons.find(v => v.mode === viewMode)?.label}
                <ChevronDown size={12} className={`text-muted-foreground transition-transform ${showViewMenu ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {showViewMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 top-full mt-1 bg-card rounded-xl shadow-elevated border border-border z-50 overflow-hidden min-w-[120px]"
                  >
                    {viewIcons.map(({ mode, icon: Icon, label }) => (
                      <button
                        key={mode}
                        onClick={() => { setViewMode(mode); setShowViewMenu(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                          viewMode === mode ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <ProfileButton />
          </div>
          {/* Subtitle */}
          <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mt-0.5 ml-9">
            {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE")}
          </p>
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
              onScheduleItem={scheduleItem}
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
              onScheduleItem={scheduleItem}
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

        {/* Today FAB - bottom left, always visible */}
        <button
          onClick={goToToday}
          className={`fixed bottom-20 left-5 font-semibold text-xs px-4 py-2.5 rounded-full shadow-elevated border z-40 transition-colors ${
            isToday(selectedDate)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-primary border-border"
          }`}
        >
          Today
        </button>

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

/* ─────────────── DAY VIEW (MS Calendar-style: parked strip + timeline) ─────────────── */

const EVENT_DEFAULT_DURATION = 60; // default 60 min display height

function DayView({ date, events, onAddEvent, onEditEvent, onToggle, onScheduleItem }: {
  date: Date;
  events: CalendarEvent[];
  onAddEvent: (time?: string) => void;
  onEditEvent: (e: CalendarEvent) => void;
  onToggle: (e: CalendarEvent) => void;
  onScheduleItem?: (event: CalendarEvent, time: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const nowHour = new Date().getHours();
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null);
  const [dropMinutes, setDropMinutes] = useState<number | null>(null);
  const [parkedExpanded, setParkedExpanded] = useState(false);

  // Resize state
  const [resizingEvent, setResizingEvent] = useState<CalendarEvent | null>(null);
  const [resizeEndMinutes, setResizeEndMinutes] = useState<number | null>(null);
  // Track custom durations per event id
  const [eventDurations, setEventDurations] = useState<Record<string, number>>({});

  useEffect(() => {
    if (scrollRef.current) {
      const target = Math.max(0, nowHour - 2) * SLOT_HEIGHT;
      scrollRef.current.scrollTop = target;
    }
  }, []);

  const parkedEvents = events.filter((e) => !e.event_time);
  const timedEvents = events.filter((e) => e.event_time);
  const visibleParked = parkedExpanded ? parkedEvents : parkedEvents.slice(0, 3);

  const yToMinutes = (clientY: number): number => {
    if (!gridRef.current || !scrollRef.current) return 0;
    const gridRect = gridRef.current.getBoundingClientRect();
    const relativeY = clientY - gridRect.top + scrollRef.current.scrollTop;
    const rawMinutes = Math.max(0, Math.min(24 * 60, relativeY));
    return snapTo15(rawMinutes);
  };

  const handleDragStart = (evt: CalendarEvent) => (e: React.DragEvent) => {
    setDraggingEvent(evt);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", evt.id);
  };

  const handleDragOverGrid = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (resizingEvent) {
      setResizeEndMinutes(yToMinutes(e.clientY));
    } else {
      setDropMinutes(yToMinutes(e.clientY));
    }
  };

  const handleDropGrid = (e: React.DragEvent) => {
    e.preventDefault();
    if (resizingEvent && resizeEndMinutes !== null) {
      const startMin = timeToMinutes(resizingEvent.event_time);
      const dur = Math.max(15, resizeEndMinutes - startMin);
      setEventDurations((prev) => ({ ...prev, [resizingEvent.id]: dur }));
      setResizingEvent(null);
      setResizeEndMinutes(null);
      return;
    }
    if (draggingEvent && onScheduleItem && dropMinutes !== null) {
      onScheduleItem(draggingEvent, minutesToTime(dropMinutes));
    }
    setDraggingEvent(null);
    setDropMinutes(null);
  };

  const handleDragEnd = () => {
    setDraggingEvent(null);
    setDropMinutes(null);
    setResizingEvent(null);
    setResizeEndMinutes(null);
  };

  // Touch-based drag for mobile
  const touchDragRef = useRef<CalendarEvent | null>(null);
  const touchResizeRef = useRef<CalendarEvent | null>(null);

  const handleTouchStart = (evt: CalendarEvent) => () => {
    touchDragRef.current = evt;
    setDraggingEvent(evt);
  };

  const handleResizeTouchStart = (evt: CalendarEvent) => (e: React.TouchEvent) => {
    e.stopPropagation();
    touchResizeRef.current = evt;
    setResizingEvent(evt);
    const touch = e.touches[0];
    setResizeEndMinutes(yToMinutes(touch.clientY));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touchResizeRef.current) {
      setResizeEndMinutes(yToMinutes(touch.clientY));
      return;
    }
    if (!touchDragRef.current) return;
    setDropMinutes(yToMinutes(touch.clientY));
  };

  const handleTouchEnd = () => {
    if (touchResizeRef.current && resizeEndMinutes !== null) {
      const startMin = timeToMinutes(touchResizeRef.current.event_time);
      const dur = Math.max(15, resizeEndMinutes - startMin);
      setEventDurations((prev) => ({ ...prev, [touchResizeRef.current!.id]: dur }));
      touchResizeRef.current = null;
      setResizingEvent(null);
      setResizeEndMinutes(null);
      return;
    }
    if (touchDragRef.current && dropMinutes !== null && onScheduleItem) {
      onScheduleItem(touchDragRef.current, minutesToTime(dropMinutes));
    }
    touchDragRef.current = null;
    setDraggingEvent(null);
    setDropMinutes(null);
  };

  const dropHour = dropMinutes !== null ? Math.floor(dropMinutes / 60) : null;

  return (
    <div className="flex flex-col" style={{ maxHeight: "calc(100vh - 200px)" }}>
      {/* ── Parked items strip ── */}
      {parkedEvents.length > 0 && (
        <div className="border-b border-border bg-muted/30 px-4 py-2 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
              Parked · {parkedEvents.length}
            </p>
            {parkedEvents.length > 3 && (
              <button onClick={() => setParkedExpanded(!parkedExpanded)} className="text-[10px] text-primary font-semibold">
                {parkedExpanded ? "Show less" : `+${parkedEvents.length - 3} more`}
              </button>
            )}
          </div>
          <p className="text-[9px] text-muted-foreground/60 mb-1.5">Drag to timeline to schedule</p>
          <div className="flex flex-wrap gap-1.5">
            {visibleParked.map((evt) => (
              <div
                key={evt.id}
                draggable
                onDragStart={handleDragStart(evt)}
                onDragEnd={handleDragEnd}
                onTouchStart={handleTouchStart(evt)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => onEditEvent(evt)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium cursor-grab active:cursor-grabbing border border-border/50 shadow-sm transition-all ${
                  draggingEvent?.id === evt.id ? "opacity-50 scale-95" : "bg-card hover:shadow-md"
                } ${evt.is_completed ? "opacity-40 line-through" : ""}`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  evt.category === "chore" ? "bg-orange-400" :
                  evt.category === "grocery-due" ? "bg-emerald-400" :
                  evt.category === "birthday" ? "bg-pink-400" :
                  evt.category === "reminder" ? "bg-blue-400" :
                  "bg-primary"
                }`} />
                <span className="truncate max-w-[120px]">{evt.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggle(evt); }}
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-0.5 ${
                    evt.is_completed ? "bg-success border-success" : "border-border"
                  }`}
                >
                  {evt.is_completed && <Check size={8} className="text-white" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Time grid ── */}
      <div ref={scrollRef} className="overflow-y-auto flex-1">
        <div
          ref={gridRef}
          className="relative"
          onDragOver={handleDragOverGrid}
          onDrop={handleDropGrid}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drop indicator line with 15-min precision */}
          {dropMinutes !== null && draggingEvent && !resizingEvent && (
            <div
              className="absolute left-14 right-2 z-20 flex items-center pointer-events-none"
              style={{ top: `${dropMinutes}px` }}
            >
              <div className="w-3 h-3 rounded-full bg-primary -ml-1.5" />
              <div className="flex-1 h-[2px] bg-primary" />
              <span className="text-[10px] font-bold text-primary bg-background/90 px-1.5 py-0.5 rounded ml-1">
                {minutesToTime(dropMinutes)}
              </span>
            </div>
          )}

          {/* Resize indicator */}
          {resizingEvent && resizeEndMinutes !== null && (
            <div
              className="absolute left-14 right-2 z-20 flex items-center pointer-events-none"
              style={{ top: `${resizeEndMinutes}px` }}
            >
              <div className="w-3 h-3 rounded-full bg-accent -ml-1.5" />
              <div className="flex-1 h-[2px] bg-accent" />
              <span className="text-[10px] font-bold text-accent bg-background/90 px-1.5 py-0.5 rounded ml-1">
                {minutesToTime(resizeEndMinutes)}
              </span>
            </div>
          )}

          {/* Current time indicator */}
          {isToday(date) && (
            <div
              className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
              style={{ top: `${(nowHour * 60 + new Date().getMinutes())}px` }}
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
                className={`flex border-b border-border/50 transition-colors ${
                  dropHour === hour && draggingEvent ? "bg-primary/10" : ""
                }`}
                style={{ minHeight: `${SLOT_HEIGHT}px` }}
              >
                <div className="w-14 shrink-0 pr-2 pt-0.5 text-right">
                  <span className="text-[10px] text-muted-foreground font-medium">{formatHour(hour)}</span>
                </div>
                <div className="flex-1 relative border-l border-border/50 pl-2 py-0.5">
                  {hourEvents.map((evt) => {
                    const evtMin = timeToMinutes(evt.event_time);
                    const offsetInHour = evtMin - hour * 60;
                    const duration = resizingEvent?.id === evt.id && resizeEndMinutes !== null
                      ? Math.max(15, resizeEndMinutes - evtMin)
                      : (eventDurations[evt.id] || EVENT_DEFAULT_DURATION);
                    const height = Math.max(15, duration);
                    return (
                      <div
                        key={evt.id}
                        draggable
                        onDragStart={handleDragStart(evt)}
                        onDragEnd={handleDragEnd}
                        onTouchStart={handleTouchStart(evt)}
                        className={`absolute left-2 right-1 cursor-grab active:cursor-grabbing ${
                          draggingEvent?.id === evt.id && !resizingEvent ? "opacity-40 scale-95" : ""
                        }`}
                        style={{ top: `${offsetInHour}px`, height: `${height}px` }}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditEvent(evt); }}
                          className={`w-full h-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium border-l-[3px] overflow-hidden ${
                            evt.is_completed ? "opacity-50" : ""
                          }`}
                          style={{
                            backgroundColor: `hsl(var(--${evt.category === "date-night" ? "secondary" : evt.category === "groceries" ? "success" : evt.category === "chore" ? "warning" : "primary"}) / 0.15)`,
                            borderLeftColor: `hsl(var(--${evt.category === "date-night" ? "secondary" : evt.category === "groceries" ? "success" : evt.category === "chore" ? "warning" : "primary"}))`,
                          }}
                        >
                          <span className={`text-foreground ${evt.is_completed ? "line-through" : ""}`}>{evt.title}</span>
                          {countdownBadge(evt) && (
                            <span className="ml-1 text-[8px] font-bold bg-primary-foreground/20 px-1.5 py-0.5 rounded-full">{countdownBadge(evt)}</span>
                          )}
                          <span className="text-muted-foreground ml-1">{evt.event_time}</span>
                          {height >= 30 && (
                            <span className="block text-[9px] text-muted-foreground mt-0.5">
                              {minutesToTime(evtMin)} – {minutesToTime(evtMin + duration)}
                            </span>
                          )}
                        </button>
                        {/* Resize handle at bottom */}
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            setResizingEvent(evt);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", "resize");
                          }}
                          onDragEnd={handleDragEnd}
                          onTouchStart={handleResizeTouchStart(evt)}
                          className="absolute bottom-0 left-0 right-0 h-3 cursor-s-resize flex items-center justify-center group"
                        >
                          <div className="w-8 h-1 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── MULTI-DAY VIEW (3-day with drag support) ─────────────── */

function MultiDayView({ startDate, events, onSelectDate, onAddEvent, onEditEvent, onToggle, onScheduleItem }: {
  startDate: Date;
  events: CalendarEvent[];
  onSelectDate: (d: Date) => void;
  onAddEvent: (d: Date, t?: string) => void;
  onEditEvent: (e: CalendarEvent) => void;
  onToggle: (e: CalendarEvent) => void;
  onScheduleItem?: (event: CalendarEvent, time: string, targetDate?: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const days = [startDate, addDays(startDate, 1), addDays(startDate, 2)];
  const nowHour = new Date().getHours();
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null);
  const [dropMinutes, setDropMinutes] = useState<number | null>(null);
  const [dropDayIdx, setDropDayIdx] = useState<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, nowHour - 2) * SLOT_HEIGHT;
    }
  }, []);

  const handleDragStart = (evt: CalendarEvent) => (e: React.DragEvent) => {
    setDraggingEvent(evt);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", evt.id);
  };

  const handleDragOverGrid = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!gridRef.current || !scrollRef.current) return;
    const gridRect = gridRef.current.getBoundingClientRect();
    const relativeY = e.clientY - gridRect.top + scrollRef.current.scrollTop;
    const rawMinutes = Math.max(0, Math.min(23 * 60 + 45, relativeY));
    setDropMinutes(snapTo15(rawMinutes));
    // Determine which day column
    const timeColWidth = 48; // w-12 = 48px
    const relativeX = e.clientX - gridRect.left - timeColWidth;
    const colWidth = (gridRect.width - timeColWidth) / 3;
    const dayIdx = Math.max(0, Math.min(2, Math.floor(relativeX / colWidth)));
    setDropDayIdx(dayIdx);
  };

  const handleDropGrid = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingEvent && onScheduleItem && dropMinutes !== null && dropDayIdx !== null) {
      const targetDate = format(days[dropDayIdx], "yyyy-MM-dd");
      onScheduleItem(draggingEvent, minutesToTime(dropMinutes), targetDate);
    }
    setDraggingEvent(null);
    setDropMinutes(null);
    setDropDayIdx(null);
  };

  const handleDragEnd = () => { setDraggingEvent(null); setDropMinutes(null); setDropDayIdx(null); };

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

      {/* Time grid with drag support */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 250px)" }}>
        <div
          ref={gridRef}
          className="relative"
          onDragOver={handleDragOverGrid}
          onDrop={handleDropGrid}
        >
          {/* Drop indicator */}
          {dropMinutes !== null && draggingEvent && dropDayIdx !== null && (
            <div
              className="absolute z-20 flex items-center pointer-events-none"
              style={{
                top: `${dropMinutes}px`,
                left: `calc(48px + ${dropDayIdx} * ((100% - 48px) / 3))`,
                width: `calc((100% - 48px) / 3)`,
              }}
            >
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div className="flex-1 h-[2px] bg-primary" />
              <span className="text-[8px] font-bold text-primary bg-background/90 px-1 rounded">
                {minutesToTime(dropMinutes)}
              </span>
            </div>
          )}

          {HOURS.map((hour) => (
            <div key={hour} className="flex min-h-[52px] border-b border-border/30" style={{ minHeight: `${SLOT_HEIGHT}px` }}>
              <div className="w-12 shrink-0 pr-1 pt-0.5 text-right">
                <span className="text-[9px] text-muted-foreground">{formatHour(hour)}</span>
              </div>

              {days.map((day, dayIdx) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const hourEvents = events.filter((e) => {
                  if (e.event_date !== dateStr) return false;
                  const m = timeToMinutes(e.event_time);
                  return m >= hour * 60 && m < (hour + 1) * 60;
                });

                return (
                  <div
                    key={day.toISOString()}
                    className={`flex-1 border-l border-border/30 px-0.5 py-0.5 transition-colors ${
                      isToday(day) ? "bg-primary/[0.03]" : ""
                    } ${dropDayIdx === dayIdx && Math.floor((dropMinutes || 0) / 60) === hour && draggingEvent ? "bg-primary/10" : ""}`}
                  >
                    {hourEvents.map((evt) => (
                      <div
                        key={evt.id}
                        draggable
                        onDragStart={handleDragStart(evt)}
                        onDragEnd={handleDragEnd}
                        className={`cursor-grab active:cursor-grabbing ${draggingEvent?.id === evt.id ? "opacity-40" : ""}`}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditEvent(evt); }}
                          className={`w-full text-left px-1 py-0.5 rounded text-[9px] font-medium leading-tight truncate ${
                            CATEGORY_COLORS[evt.category] || "bg-primary/50"
                          } text-primary-foreground ${evt.is_completed ? "opacity-50" : ""}`}
                        >
                          {evt.title}
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
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
                  {dayEvts.slice(0, 4).map((evt, i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full ${
                        evt.category === "date-night" ? "bg-secondary" :
                        evt.category === "groceries" ? "bg-success" :
                        evt.category === "chore" ? "bg-orange-400" :
                        evt.category === "grocery-due" ? "bg-emerald-400" :
                        evt.category === "birthday" ? "bg-pink-400" :
                        evt.category === "reminder" ? "bg-blue-400" :
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
          <span className="text-[10px] text-muted-foreground">{selectedEvents.length} item{selectedEvents.length !== 1 ? "s" : ""}</span>
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
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] text-muted-foreground">
                        {evt.event_time || "All day"} • {CATEGORY_LABEL[evt.category] || evt.category}
                        {evt.assigned_to !== "both" ? ` • ${evt.assigned_to}` : ""}
                      </p>
                      {countdownBadge(evt) && (
                        <span className="text-[9px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                          {countdownBadge(evt)}
                        </span>
                      )}
                    </div>
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
