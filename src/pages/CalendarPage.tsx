import { useState, useEffect, useRef, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
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
import { useNavigate } from "react-router-dom";
import { useAppMode } from "@/hooks/useAppMode";
import ProfileButton from "@/components/ProfileButton";
import AddEventModal from "@/components/AddEventModal";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { toast } from "sonner";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_CALENDAR_EVENTS } from "@/lib/demoData";

const CATEGORIES = ["date-night", "groceries", "cleaning", "bills", "travel", "family", "chore", "reminder", "birthday", "grocery-due", "diet"] as const;
const CATEGORY_ICONS: Record<string, any> = {
  "date-night": Coffee, groceries: ShoppingCart, cleaning: Tv,
  travel: Cake, family: Users, bills: Tag,
  chore: Tv, reminder: Clock, birthday: Cake, "grocery-due": ShoppingCart,
  diet: Coffee,
};
const CATEGORY_COLORS: Record<string, string> = {
  "date-night": "bg-secondary/70", groceries: "bg-success/70", cleaning: "bg-accent",
  travel: "bg-warning/70", family: "bg-primary/70", bills: "bg-muted-foreground/50",
  chore: "bg-orange-400/70", reminder: "bg-blue-400/70", birthday: "bg-pink-400/70", "grocery-due": "bg-emerald-400/70",
  diet: "bg-green-400/70",
};
const CATEGORY_LABEL: Record<string, string> = {
  "date-night": "Romance", groceries: "Household", cleaning: "Cleaning",
  bills: "Bills", travel: "Travel", family: "Family",
  chore: "Chore", reminder: "Reminder", birthday: "Birthday", "grocery-due": "Shopping",
  diet: "Diet",
};

type ViewMode = "day" | "week" | "multiday" | "month";

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

// Expand recurring events into virtual daily/weekly instances
function expandRecurringEvents(events: CalendarEvent[]): CalendarEvent[] {
  const today = new Date();
  const windowStart = subDays(today, 30);
  const windowEnd = addDays(today, 60);
  const result: CalendarEvent[] = [];

  for (const event of events) {
    if (event.recurrence === "daily") {
      // Create an instance for each day in the window
      const days = eachDayOfInterval({ start: windowStart, end: windowEnd });
      for (const day of days) {
        const dateStr = format(day, "yyyy-MM-dd");
        result.push({ ...event, event_date: dateStr, id: `${event.id}-daily-${dateStr}` });
      }
    } else if (event.recurrence === "weekly") {
      // Find the day-of-week from the original event_date
      const originalDay = parseISO(event.event_date).getDay();
      const days = eachDayOfInterval({ start: windowStart, end: windowEnd });
      for (const day of days) {
        if (day.getDay() === originalDay) {
          const dateStr = format(day, "yyyy-MM-dd");
          result.push({ ...event, event_date: dateStr, id: `${event.id}-weekly-${dateStr}` });
        }
      }
    } else {
      result.push(event);
    }
  }
  return result;
}

const DIET_CATEGORIES = [
  { key: "morning", label: "Morning", icon: "☀️" },
  { key: "breakfast", label: "Breakfast", icon: "🍳" },
  { key: "lunch", label: "Lunch", icon: "🍛" },
  { key: "evening_snack", label: "Snack", icon: "🧃" },
  { key: "dinner", label: "Dinner", icon: "🥘" },
  { key: "night", label: "Night", icon: "🥛" },
];
const DIET_ASSIGN = [
  { value: "me", label: "Me" },
  { value: "partner", label: "Partner" },
  { value: "both", label: "Both" },
];
const DIET_DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function CalendarDietForm({ defaultDate, onClose, onSave, t }: {
  defaultDate: string;
  onClose: () => void;
  onSave: (data: { description: string; category: string; notes: string; assigned_to: string; calories: number | null; log_date: string; event_time: string; recurrence: string; recurrence_day: number | null }) => void;
  t: (key: string) => string;
}) {
  const { isSingle } = useAppMode();
  const [desc, setDesc] = useState("");
  const [notes, setNotes] = useState("");
  const [cal, setCal] = useState("");
  const [cat, setCat] = useState("morning");
  const [assignedTo, setAssignedTo] = useState("me");
  const [logDate, setLogDate] = useState(defaultDate);
  const [eventTime, setEventTime] = useState("");
  const [recurrence, setRecurrence] = useState("once");
  const [recurrenceDay, setRecurrenceDay] = useState<number | null>(new Date(defaultDate + "T00:00:00").getDay());

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/50 z-[60]" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 max-h-[72vh] bg-card rounded-t-3xl z-[60] overflow-y-auto safe-bottom"
      >
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-2" />
        <div className="px-5 pb-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-foreground">{t("calendar.addDietItem")}</h3>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>

          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">{t("calendar.foodName")}</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Warm lemon water"
            className="w-full h-11 bg-muted rounded-2xl px-4 text-sm text-foreground placeholder:text-muted-foreground border-none focus:outline-none focus:ring-2 focus:ring-ring mb-4" />

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <CalendarPlus size={12} /> Date
              </label>
              <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                className="w-full h-11 bg-muted rounded-2xl px-4 text-sm text-foreground border-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock size={12} /> Time
              </label>
              <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)}
                className="w-full h-11 bg-muted rounded-2xl px-4 text-sm text-foreground border-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">{t("calendar.frequency")}</label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(["once", "daily", "weekly"] as const).map(r => (
              <button key={r} onClick={() => setRecurrence(r)}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  recurrence === r ? "bg-primary/20 ring-2 ring-primary text-foreground" : "bg-muted text-muted-foreground"
                }`}>
                {r === "once" ? t("calendar.onceFreq") : r === "daily" ? t("calendar.dailyFreq") : t("calendar.weeklyFreq")}
              </button>
            ))}
          </div>
          {recurrence === "weekly" && (
            <div className="flex gap-1.5 mb-4">
              {DIET_DAY_LABELS.map((label, idx) => (
                <button key={idx} onClick={() => setRecurrenceDay(idx)}
                  className={`flex-1 h-9 rounded-xl text-xs font-bold transition-all ${
                    recurrenceDay === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">{t("calendar.category")}</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {DIET_CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setCat(c.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  cat === c.key ? "bg-primary/20 ring-2 ring-primary text-foreground" : "bg-muted text-muted-foreground"
                }`}>
                <span>{c.icon}</span>
                <span className="truncate">{c.label}</span>
              </button>
            ))}
          </div>

          {!isSingle && (
            <>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">{t("calendar.assignedTo")}</label>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {DIET_ASSIGN.map(a => (
                  <button key={a.value} onClick={() => setAssignedTo(a.value)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      assignedTo === a.value ? "bg-primary/20 ring-2 ring-primary text-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                    {a.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="No sugar, etc."
                className="w-full h-11 bg-muted rounded-2xl px-4 text-sm text-foreground placeholder:text-muted-foreground border-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Calories</label>
              <input value={cal} onChange={e => setCal(e.target.value.replace(/\D/g, ""))} placeholder="Optional"
                className="w-full h-11 bg-muted rounded-2xl px-4 text-sm text-foreground placeholder:text-muted-foreground border-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-11 rounded-2xl bg-muted text-foreground text-sm font-semibold">{t("common.cancel")}</button>
            <button onClick={() => { if (desc.trim()) onSave({ description: desc.trim(), category: cat, notes: notes.trim() || "", assigned_to: assignedTo, calories: cal ? parseInt(cal) : null, log_date: logDate, event_time: eventTime, recurrence, recurrence_day: recurrence === "weekly" ? recurrenceDay : null }); }}
              disabled={!desc.trim()}
              className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40">
              Add
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { partnerPair, loading: ppLoading } = usePartnerPair();
  const { canAccess } = useSubscriptionContext();
  const { isDemoMode } = useDemo();
  const { t } = useLanguage();
  const { isSingle } = useAppMode();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showDietForm, setShowDietForm] = useState(false);
  const [dietSaving, setDietSaving] = useState(false);
  const [choreLinkedItems, setChoreLinkedItems] = useState<Record<string, any[]>>({});
  const [expandedChores, setExpandedChores] = useState<Set<string>>(new Set());

  const toggleChoreExpand = (choreId: string) => {
    setExpandedChores(prev => {
      const next = new Set(prev);
      if (next.has(choreId)) next.delete(choreId); else next.add(choreId);
      return next;
    });
  };

  const toggleLinkedItem = async (itemId: string, currentChecked: boolean) => {
    await supabase.from("grocery_items").update({ is_checked: !currentChecked }).eq("id", itemId);
    await refreshEvents();
  };

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formCategory, setFormCategory] = useState<string>("date-night");
  const [formAssigned, setFormAssigned] = useState("both");
  const [formPriority, setFormPriority] = useState("medium");
  const [formDate, setFormDate] = useState("");

  const refreshEvents = async () => {
    if (!partnerPair) return;
    const [eventsRes, choresRes, groceryRes] = await Promise.all([
      supabase.from("calendar_events").select("*").eq("partner_pair", partnerPair),
      supabase.from("chores").select("*").eq("partner_pair", partnerPair),
      supabase.from("grocery_items").select("*").eq("partner_pair", partnerPair).not("due_date", "is", null),
    ]);
    const calEvents: CalendarEvent[] = eventsRes.data || [];
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
      _source: "chore" as const,
      _sourceId: chore.id,
    }));
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
      _source: "grocery" as const,
      _sourceId: item.id,
    }));
    // Fetch linked items for chores
    const choreIds = (choresRes.data || []).map((c: any) => c.id);
    const linkedMap: Record<string, any[]> = {};
    if (choreIds.length > 0) {
      const { data: linked } = await supabase
        .from("chore_linked_items")
        .select("chore_id, grocery_items(*)")
        .in("chore_id", choreIds);
      if (linked) {
        for (const row of linked as any[]) {
          if (!linkedMap[row.chore_id]) linkedMap[row.chore_id] = [];
          if (row.grocery_items) linkedMap[row.chore_id].push(row.grocery_items);
        }
      }
    }
    setChoreLinkedItems(linkedMap);

    const baseEvents = [...calEvents, ...choreEvents, ...groceryEvents];
    setEvents(expandRecurringEvents(baseEvents));
  };

  useEffect(() => {
    refreshEvents();
  }, [partnerPair]);

  // Inject demo events when in demo mode and no real data
  useEffect(() => {
    if (isDemoMode && events.length === 0) {
      setEvents(DEMO_CALENDAR_EVENTS as CalendarEvent[]);
    }
  }, [isDemoMode, events.length]);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const dayEvents = events.filter((e) => e.event_date === selectedDateStr);

  const navigatePrev = () => {
    if (viewMode === "day") { setCurrentDate((d) => subDays(d, 1)); setSelectedDate((d) => subDays(d, 1)); }
    else if (viewMode === "week") { setCurrentDate((d) => subDays(d, 7)); setSelectedDate((d) => subDays(d, 7)); }
    else if (viewMode === "multiday") { setCurrentDate((d) => subDays(d, 3)); setSelectedDate((d) => subDays(d, 3)); }
    else setCurrentDate((d) => subMonths(d, 1));
  };

  const navigateNext = () => {
    if (viewMode === "day") { setCurrentDate((d) => addDays(d, 1)); setSelectedDate((d) => addDays(d, 1)); }
    else if (viewMode === "week") { setCurrentDate((d) => addDays(d, 7)); setSelectedDate((d) => addDays(d, 7)); }
    else if (viewMode === "multiday") { setCurrentDate((d) => addDays(d, 3)); setSelectedDate((d) => addDays(d, 3)); }
    else setCurrentDate((d) => addMonths(d, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
    const todayStr = format(today, "yyyy-MM-dd");
    const todayEvents = events.filter(e => e.event_date === todayStr && !e.is_completed);
    if (todayEvents.length > 0) {
      toast.success(`${todayEvents.length} event${todayEvents.length > 1 ? "s" : ""} today: ${todayEvents.map(e => e.title).join(", ")}`);
    } else {
      toast("No events today — enjoy your free time! ✨");
    }
    if (viewMode === "month") setViewMode("week");
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
    // Diet items — navigate to diet page
    if (event.category === "diet") {
      navigate("/diet");
      return;
    }
    // Chore items — toggle linked items expansion
    if (event._source === "chore") {
      const choreId = event._sourceId || "";
      if (choreLinkedItems[choreId]?.length > 0) {
        toggleChoreExpand(choreId);
      } else {
        toast.info("Chore — tap ✓ to toggle completion");
      }
      return;
    }
    if (event._source === "grocery") {
      toast.info("Grocery item — tap ✓ to toggle completion");
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
      const { error } = await supabase
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
        .eq("id", editingEvent.id);
      if (error) { toast.error("Failed to update event"); return; }
      toast.success("Event updated ✨");
    } else {
      // Free tier: cap at 10 calendar events
      if (!canAccess("unlimited-calendar")) {
        const { count } = await supabase
          .from("calendar_events")
          .select("id", { count: "exact", head: true })
          .eq("partner_pair", partnerPair);
        if ((count ?? 0) >= 10) {
          toast.error("Free plan limited to 10 events. Upgrade to Pro for unlimited!");
          return;
        }
      }
      const { error } = await supabase
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
        });
      if (error) { toast.error("Failed to add event"); return; }
      toast.success("Event added 🎉");
    }
    setShowAdd(false);
    await refreshEvents();
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Event removed");
    await refreshEvents();
  };

  const toggleComplete = async (event: CalendarEvent) => {
    if (event._source === "chore") {
      await supabase.from("chores").update({ is_completed: !event.is_completed }).eq("id", event._sourceId!);
    } else if (event._source === "grocery") {
      await supabase.from("grocery_items").update({ is_checked: !event.is_completed }).eq("id", event._sourceId!);
    } else {
      await supabase.from("calendar_events").update({ is_completed: !event.is_completed }).eq("id", event.id);
    }
    await refreshEvents();
  };

  const scheduleItem = async (event: CalendarEvent, time: string, targetDate?: string) => {
    const newDate = targetDate || event.event_date;
    if (event._source === "chore" || event._source === "grocery") {
      if (!user || !partnerPair) return;
      const { error } = await supabase.from("calendar_events").insert({
        title: event.title,
        description: event.description,
        category: event._source === "chore" ? "chore" : "grocery-due",
        event_date: newDate,
        event_time: time,
        assigned_to: event._source === "grocery" ? "both" : event.assigned_to,
        priority: event.priority,
        recurrence: "once",
        user_id: user.id,
        partner_pair: partnerPair,
      });
      if (error) { toast.error("Failed to schedule"); return; }
      toast.success(`Scheduled at ${time} ⏰`);
      await refreshEvents();
      return;
    }
    // Regular calendar event — update time (and optionally date)
    const updatePayload: any = { event_time: time };
    if (targetDate) updatePayload.event_date = targetDate;
    const { error } = await supabase.from("calendar_events").update(updatePayload).eq("id", event.id);
    if (error) { toast.error("Failed to reschedule"); return; }
    toast.success(`Moved to ${time} ⏰`);
    await refreshEvents();
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
    { mode: "day" as ViewMode, icon: Calendar, label: "Day" },
    { mode: "week" as ViewMode, icon: CalendarDays, label: "Week" },
    { mode: "multiday" as ViewMode, icon: List, label: "3 Day" },
    { mode: "month" as ViewMode, icon: LayoutGrid, label: "Month" },
  ];

  return (
    <PageTransition>
      <div className="flex flex-col h-full">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 px-5 pt-10 pb-3 bg-background">
          {/* Title row with inline view picker — Apple Calendar style */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ProfileButton />
              <button onClick={navigatePrev} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button onClick={goToToday} className="text-left">
                <h1 className="text-lg font-bold text-foreground leading-tight">
                  {viewMode === "week"
                    ? (() => {
                        const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
                        const we = addDays(ws, 6);
                        return isSameMonth(ws, we)
                          ? `${format(ws, "MMM d")} – ${format(we, "d, yyyy")}`
                          : `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
                      })()
                    : viewMode === "day" || viewMode === "multiday"
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
          </div>
          {/* Subtitle */}
          <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mt-0.5 ml-9">
            {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE")}
          </p>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {viewMode === "week" && (
            <WeekView
              currentDate={currentDate}
              selectedDate={selectedDate}
              events={events}
              onSelectDate={(d) => setSelectedDate(d)}
              onEditEvent={openEditForm}
              onToggle={toggleComplete}
              onAddEvent={() => openAddForm()}
              choreLinkedItems={choreLinkedItems}
              expandedChores={expandedChores}
              onToggleLinkedItem={toggleLinkedItem}
            />
          )}

          {viewMode === "day" && (
            <>
              {/* Today's / Selected day's events */}
              {dayEvents.length > 0 ? (
                <div className="px-5 pb-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    {isToday(selectedDate) ? "Today's Events" : format(selectedDate, "EEEE's Events")}
                  </p>
                  <div className="space-y-1.5">
                    {dayEvents
                      .sort((a, b) => (a.event_time || "").localeCompare(b.event_time || ""))
                      .map((evt) => (
                        <div
                          key={evt.id}
                          onClick={() => openEditForm(evt)}
                          className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card shadow-soft border border-border cursor-pointer ${evt.is_completed ? "opacity-50" : ""}`}
                        >
                          <div className={`w-1 self-stretch rounded-full ${CATEGORY_COLORS[evt.category] || "bg-primary/50"}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold text-foreground ${evt.is_completed ? "line-through" : ""}`}>
                              {evt.title}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[10px] text-muted-foreground">
                                {evt.event_time || "All day"} • {CATEGORY_LABEL[evt.category] || evt.category}
                                {!isSingle && evt.assigned_to !== "both" ? ` • ${evt.assigned_to}` : ""}
                              </p>
                              {countdownBadge(evt) && (
                                <span className="text-[9px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                                  {countdownBadge(evt)}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleComplete(evt); }}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              evt.is_completed ? "bg-success border-success" : "border-border"
                            }`}
                          >
                            {evt.is_completed && <Check size={10} className="text-success-foreground" />}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="px-5 py-8 text-center">
                  <CalendarPlus size={28} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground mb-1">No events {isToday(selectedDate) ? "today" : "this day"}</p>
                  <p className="text-xs text-muted-foreground">Tap + to add one</p>
                </div>
              )}

              {/* Upcoming Events (future from selected date) */}
              <div className="mt-4">
                <p className="px-5 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Upcoming Events</p>
                <ListView
                  events={events.filter(e => e.event_date > selectedDateStr)}
                  onEditEvent={openEditForm}
                  onToggle={toggleComplete}
                  onAddEvent={() => openAddForm()}
                />
              </div>
            </>
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

        </div>


        {/* FAB with menu */}
        {showFabMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="fixed right-5 z-50 flex flex-col gap-2 items-end" style={{ bottom: 'calc(var(--nav-total) + 4.5rem)' }}
          >
            <button
              onClick={() => { setShowFabMenu(false); openAddForm(); }}
              className="flex items-center gap-2 bg-card text-foreground px-4 py-2.5 rounded-2xl shadow-elevated border border-border text-sm font-semibold"
            >
              <CalendarPlus size={16} className="text-primary" /> Add Event
            </button>
            <button
              onClick={() => { setShowFabMenu(false); setShowDietForm(true); }}
              className="flex items-center gap-2 bg-card text-foreground px-4 py-2.5 rounded-2xl shadow-elevated border border-border text-sm font-semibold"
            >
              <span className="text-base">🥗</span> Add Diet Item
            </button>
          </motion.div>
        )}
        {showFabMenu && (
          <div className="fixed inset-0 z-40" onClick={() => setShowFabMenu(false)} />
        )}
        <button
          onClick={() => setShowFabMenu(prev => !prev)}
          className="fixed bottom-above-nav right-5 max-w-lg love-gradient text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center shadow-elevated z-50"
        >
          <Plus size={22} className={`transition-transform ${showFabMenu ? "rotate-45" : ""}`} />
        </button>

        {/* Diet Form Bottom Sheet */}
        <AnimatePresence>
          {showDietForm && <CalendarDietForm t={t}
            defaultDate={format(selectedDate, "yyyy-MM-dd")}
            onClose={() => setShowDietForm(false)}
            onSave={async (data) => {
              if (!user || !partnerPair || dietSaving) return;
              setDietSaving(true);
              try {
                const { data: row, error } = await supabase.from("diet_logs").insert({
                  user_id: user.id, partner_pair: partnerPair, meal_type: data.category,
                  description: data.description, notes: data.notes || null, assigned_to: data.assigned_to,
                  calories: data.calories, log_date: data.log_date, event_time: data.event_time || null,
                  recurrence: data.recurrence, recurrence_day: data.recurrence_day,
                }).select().single();
                if (!error && row) {
                  // Also sync to calendar_events
                  await supabase.from("calendar_events").insert({
                    title: `🥗 ${data.description}`,
                    description: `Diet: ${data.category}${data.notes ? ` — ${data.notes}` : ""}`,
                    category: "diet",
                    event_date: data.log_date,
                    event_time: data.event_time || null,
                    assigned_to: data.assigned_to,
                    priority: "low",
                    recurrence: data.recurrence,
                    user_id: user.id,
                    partner_pair: partnerPair,
                  });
                  await refreshEvents();
                  toast.success("Diet item added!");
                  setShowDietForm(false);
                } else {
                  toast.error("Failed to add diet item");
                }
              } finally {
                setDietSaving(false);
              }
            }}
          />}
        </AnimatePresence>

        {/* Add/Edit Event Modal */}
        <AddEventModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          editingEvent={editingEvent}
          defaultDate={selectedDate}
          defaultTime={formTime}
          onEventSaved={async () => {
            await refreshEvents();
          }}
          onEventDeleted={async () => {
            await refreshEvents();
          }}
        />
      </div>
    </PageTransition>
  );
}

/* ─────────────── WEEK VIEW (horizontal strip + day event list) ─────────────── */

function WeekView({ currentDate, selectedDate, events, onSelectDate, onEditEvent, onToggle, onAddEvent, choreLinkedItems, expandedChores, onToggleLinkedItem }: {
  currentDate: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  onSelectDate: (d: Date) => void;
  onEditEvent: (e: CalendarEvent) => void;
  onToggle: (e: CalendarEvent) => void;
  onAddEvent: () => void;
  choreLinkedItems?: Record<string, any[]>;
  expandedChores?: Set<string>;
  onToggleLinkedItem?: (itemId: string, currentChecked: boolean) => void;
}) {
  const { isSingle } = useAppMode();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const selectedEvents = events
    .filter((e) => e.event_date === selectedDateStr)
    .sort((a, b) => (a.event_time || "").localeCompare(b.event_time || ""));

  // Upcoming events after selected date
  const upcomingEvents = events.filter(e => e.event_date > selectedDateStr);

  return (
    <div>
      {/* Week strip */}
      <div className="px-3 pb-3">
        <div className="flex gap-1">
          {weekDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayEvts = events.filter((e) => e.event_date === dateStr);
            const isSelected = isSameDay(day, selectedDate);
            const today = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => onSelectDate(day)}
                className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-md"
                    : today
                    ? "bg-primary/10"
                    : "hover:bg-muted"
                }`}
              >
                <span className={`text-[10px] font-semibold uppercase ${
                  isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                }`}>
                  {format(day, "EEE")}
                </span>
                <span className={`text-base font-bold mt-0.5 ${
                  isSelected ? "text-primary-foreground" : today ? "text-primary" : "text-foreground"
                }`}>
                  {format(day, "d")}
                </span>
                {/* Event dots */}
                {dayEvts.length > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {dayEvts.slice(0, 3).map((evt, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full ${
                          isSelected ? "bg-primary-foreground/60" :
                          evt.category === "date-night" ? "bg-secondary" :
                          evt.category === "groceries" ? "bg-success" :
                          evt.category === "chore" ? "bg-orange-400" :
                          evt.category === "birthday" ? "bg-pink-400" :
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
      </div>

      {/* Selected day events */}
      {selectedEvents.length > 0 ? (
        <div className="px-5 pb-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
            {isToday(selectedDate) ? "Today's Events" : format(selectedDate, "EEEE's Events")}
          </p>
          <div className="space-y-1.5">
            {selectedEvents.map((evt) => (
              <div
                key={evt.id}
                onClick={() => onEditEvent(evt)}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card shadow-soft border border-border cursor-pointer ${evt.is_completed ? "opacity-50" : ""}`}
              >
                <div className={`w-1 self-stretch rounded-full ${CATEGORY_COLORS[evt.category] || "bg-primary/50"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold text-foreground ${evt.is_completed ? "line-through" : ""}`}>
                    {evt.title}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] text-muted-foreground">
                      {evt.event_time || "All day"} • {CATEGORY_LABEL[evt.category] || evt.category}
                      {!isSingle && evt.assigned_to !== "both" ? ` • ${evt.assigned_to}` : ""}
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
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-5 py-8 text-center">
          <CalendarPlus size={28} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground mb-1">No events {isToday(selectedDate) ? "today" : "this day"}</p>
          <p className="text-xs text-muted-foreground">Tap + to add one</p>
        </div>
      )}

      {/* Upcoming Events */}
      <div className="mt-4">
        <p className="px-5 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Upcoming Events</p>
        <ListView
          events={upcomingEvents}
          onEditEvent={onEditEvent}
          onToggle={onToggle}
          onAddEvent={onAddEvent}
        />
      </div>
    </div>
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

  return <div />;
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
  const { isSingle } = useAppMode();

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
                <div
                  key={evt.id}
                  onClick={() => onEditEvent(evt)}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card shadow-soft border border-border cursor-pointer ${evt.is_completed ? "opacity-50" : ""}`}
                >
                  <div className={`w-1 self-stretch rounded-full ${CATEGORY_COLORS[evt.category] || "bg-primary/50"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold text-foreground ${evt.is_completed ? "line-through" : ""}`}>
                      {evt.title}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] text-muted-foreground">
                        {evt.event_time || "All day"} • {CATEGORY_LABEL[evt.category] || evt.category}
                        {!isSingle && evt.assigned_to !== "both" ? ` • ${evt.assigned_to}` : ""}
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
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
