import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Plus, Check, Trash2, Edit3, X, ChevronDown, ChevronRight,
  Sparkles, PartyPopper, Users, User, Heart, CalendarDays, Clock, Repeat,
  Bot, Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DietItem {
  id: string;
  user_id: string;
  partner_pair: string;
  meal_type: string;
  description: string;
  calories: number | null;
  notes: string | null;
  assigned_to: string;
  is_completed: boolean;
  log_date: string;
  event_time: string | null;
  recurrence: string;
  recurrence_day: number | null;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: "morning", label: "Morning (After Wake Up)", emoji: "🌅", icon: "☀️" },
  { key: "breakfast", label: "Breakfast", emoji: "🥣", icon: "🍳" },
  { key: "lunch", label: "Lunch", emoji: "🥗", icon: "🍛" },
  { key: "evening_snack", label: "Evening Snack", emoji: "🍎", icon: "🧃" },
  { key: "dinner", label: "Dinner", emoji: "🍽️", icon: "🥘" },
  { key: "night", label: "Night", emoji: "🌙", icon: "🥛" },
];

const ASSIGN_OPTIONS = [
  { value: "me", label: "Me", icon: User },
  { value: "partner", label: "Partner", icon: Heart },
  { value: "both", label: "Both", icon: Users },
];

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Confetti Component ──────────────────────────────────────────────────────

function Confetti({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [onDone]);

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.3,
    color: ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--success))", "hsl(var(--warning))"][i % 4],
    size: 4 + Math.random() * 6,
  }));

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: "50vh", x: `${p.x}vw`, opacity: 1, scale: 1, rotate: 0 }}
          animate={{ y: "-10vh", opacity: 0, scale: 0.5, rotate: 360 + Math.random() * 360 }}
          transition={{ duration: 1.2, delay: p.delay, ease: "easeOut" }}
          className="absolute rounded-full"
          style={{ width: p.size, height: p.size, backgroundColor: p.color }}
        />
      ))}
    </div>
  );
}

// ─── Add/Edit Modal ──────────────────────────────────────────────────────────

function DietFormModal({
  editing,
  category,
  defaultDate,
  onSave,
  onClose,
}: {
  editing: DietItem | null;
  category: string;
  defaultDate: string;
  onSave: (data: { description: string; category: string; notes: string; assigned_to: string; calories: number | null; log_date: string; event_time: string; recurrence: string; recurrence_day: number | null }) => void;
  onClose: () => void;
}) {
  const [desc, setDesc] = useState(editing?.description || "");
  const [notes, setNotes] = useState(editing?.notes || "");
  const [cal, setCal] = useState(editing?.calories?.toString() || "");
  const [cat, setCat] = useState(editing?.meal_type || category);
  const [assignedTo, setAssignedTo] = useState(editing?.assigned_to || "me");
  const [logDate, setLogDate] = useState(editing?.log_date || defaultDate);
  const [eventTime, setEventTime] = useState(editing?.event_time || "");
  const [recurrence, setRecurrence] = useState(editing?.recurrence || "once");
  const [recurrenceDay, setRecurrenceDay] = useState<number | null>(
    editing?.recurrence_day ?? new Date(defaultDate + "T00:00:00").getDay()
  );

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/50 z-[60]" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 max-h-[80vh] bg-card rounded-t-3xl z-[60] overflow-y-auto safe-bottom"
      >
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-2" />
        <div className="px-5 pb-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-foreground">{editing ? "Edit Item" : "Add Diet Item"}</h3>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>

          {/* Food Name */}
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Food Name</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Warm lemon water"
            className="w-full h-11 bg-muted rounded-2xl px-4 text-sm text-foreground placeholder:text-muted-foreground border-none focus:outline-none focus:ring-2 focus:ring-ring mb-4" />

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <CalendarDays size={12} /> Date
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

          {/* Frequency */}
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Repeat size={12} /> Frequency
          </label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(["once", "daily", "weekly"] as const).map(r => (
              <button key={r} onClick={() => setRecurrence(r)}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  recurrence === r ? "bg-primary/20 ring-2 ring-primary text-foreground" : "bg-muted text-muted-foreground"
                }`}>
                {r === "once" ? "Once" : r === "daily" ? "🔁 Daily" : "🔁 Weekly"}
              </button>
            ))}
          </div>
          {recurrence === "weekly" && (
            <div className="flex gap-1.5 mb-4">
              {DAY_LABELS.map((label, idx) => (
                <button key={idx} onClick={() => setRecurrenceDay(idx)}
                  className={`flex-1 h-9 rounded-xl text-xs font-bold transition-all ${
                    recurrenceDay === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Category</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setCat(c.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  cat === c.key ? "bg-primary/20 ring-2 ring-primary text-foreground" : "bg-muted text-muted-foreground"
                }`}>
                <span>{c.icon}</span>
                <span className="truncate">{c.label.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          {/* Assigned To */}
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Assigned To</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {ASSIGN_OPTIONS.map(a => (
              <button key={a.value} onClick={() => setAssignedTo(a.value)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  assignedTo === a.value ? "bg-primary/20 ring-2 ring-primary text-foreground" : "bg-muted text-muted-foreground"
                }`}>
                <a.icon size={14} />
                {a.label}
              </button>
            ))}
          </div>

          {/* Notes + Calories */}
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
            <button onClick={onClose} className="flex-1 h-11 rounded-2xl bg-muted text-foreground text-sm font-semibold">Cancel</button>
            <button onClick={() => { if (desc.trim()) onSave({ description: desc.trim(), category: cat, notes: notes.trim() || "", assigned_to: assignedTo, calories: cal ? parseInt(cal) : null, log_date: logDate, event_time: eventTime, recurrence, recurrence_day: recurrence === "weekly" ? recurrenceDay : null }); }}
              disabled={!desc.trim()}
              className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40">
              {editing ? "Update" : "Add"}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Category Section ────────────────────────────────────────────────────────

function CategorySection({
  category,
  items,
  userId,
  partnerName,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  expanded,
  onExpand,
}: {
  category: typeof CATEGORIES[0];
  items: DietItem[];
  userId: string;
  partnerName: string;
  onToggle: (id: string) => void;
  onEdit: (item: DietItem) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  expanded: boolean;
  onExpand: () => void;
}) {
  const done = items.filter(i => i.is_completed).length;

  return (
    <div className="mb-3">
      <div className="w-full flex items-center gap-3 px-4 py-3 bg-card rounded-2xl shadow-soft transition-all">
        <button onClick={onExpand} className="flex items-center gap-3 flex-1 active:scale-[0.98] transition-transform">
          <span className="text-xl">{category.emoji}</span>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-foreground">{category.label}</p>
            <p className="text-[10px] text-muted-foreground">{items.length} items · {done} done</p>
          </div>
        </button>
        {items.length > 0 && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            done === items.length && items.length > 0 ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
          }`}>
            {done}/{items.length}
          </span>
        )}
        <button onClick={(e) => { e.stopPropagation(); onAdd(); }}
          className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
          <Plus size={14} className="text-primary" />
        </button>
        <button onClick={onExpand}>
          {expanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && items.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-1.5 pl-2">
              {items.map(item => {
                const assignLabel = item.assigned_to === "me"
                  ? (item.user_id === userId ? "You" : partnerName)
                  : item.assigned_to === "partner"
                    ? (item.user_id === userId ? partnerName : "You")
                    : "Both";

                return (
                  <motion.div key={item.id} layout
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all ${
                      item.is_completed ? "bg-success/5 border border-success/20" : "bg-card border border-border shadow-soft"
                    }`}
                  >
                    <button onClick={() => onToggle(item.id)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                        item.is_completed ? "bg-success" : "border-2 border-border"
                      }`}>
                      {item.is_completed && <Check size={12} className="text-success-foreground" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${item.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">{assignLabel}</span>
                        {item.event_time && <span className="text-[10px] text-muted-foreground">· 🕐 {item.event_time}</span>}
                        {item.recurrence === "daily" && <span className="text-[10px] font-semibold text-primary">· 🔁 Daily</span>}
                        {item.recurrence === "weekly" && <span className="text-[10px] font-semibold text-primary">· 🔁 Weekly · {DAY_NAMES[item.recurrence_day ?? 0]}</span>}
                        {item.notes && <span className="text-[10px] text-muted-foreground">· {item.notes}</span>}
                        {item.calories && <span className="text-[10px] text-muted-foreground">· {item.calories} cal</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button onClick={() => onEdit(item)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                        <Edit3 size={12} className="text-muted-foreground" />
                      </button>
                      <button onClick={() => onDelete(item.id)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                        <Trash2 size={12} className="text-muted-foreground" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DietPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();

  const { toast } = useToast();

  const [items, setItems] = useState<DietItem[]>([]);
  const [partnerName, setPartnerName] = useState("Partner");
  const [expandedCats, setExpandedCats] = useState<string[]>(["morning", "breakfast", "lunch"]);
  const [showForm, setShowForm] = useState(false);
  const [formCategory, setFormCategory] = useState("morning");
  const [editingItem, setEditingItem] = useState<DietItem | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [saving, setSaving] = useState(false);

  // AI Diet
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ meal_type: string; description: string; calories: number; notes?: string; emoji: string }[] | null>(null);
  const [aiTip, setAiTip] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!partnerPair) return;
    const dayOfWeek = new Date().getDay();
    supabase.from("diet_logs").select("*").eq("partner_pair", partnerPair)
      .or(`log_date.eq.${today},recurrence.eq.daily,and(recurrence.eq.weekly,recurrence_day.eq.${dayOfWeek})`)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setItems(data as DietItem[]); });
  }, [partnerPair, today]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("partner_id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.partner_id) {
          supabase.from("profiles").select("display_name").eq("id", data.partner_id).maybeSingle()
            .then(({ data: p }) => { if (p?.display_name) setPartnerName(p.display_name.split(" ")[0]); });
        }
      });
  }, [user]);

  // ─── Realtime sync ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!partnerPair) return;
    const channel = supabase
      .channel("diet-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "diet_logs" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newItem = payload.new as DietItem;
          if (newItem.partner_pair === partnerPair && newItem.log_date === today) {
            setItems(prev => prev.some(i => i.id === newItem.id) ? prev : [...prev, newItem]);
          }
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as DietItem;
          setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
        } else if (payload.eventType === "DELETE") {
          const old = payload.old as { id: string };
          setItems(prev => prev.filter(i => i.id !== old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [partnerPair, today]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const buildDietCalendarPayload = (data: { description: string; category: string; notes: string; assigned_to: string; log_date: string; event_time: string; recurrence: string }) => ({
    title: `🥗 ${data.description}`,
    description: `Diet: ${CATEGORIES.find(c => c.key === data.category)?.label || data.category}${data.notes ? ` — ${data.notes}` : ""}`,
    category: "diet",
    event_date: data.log_date,
    event_time: data.event_time || null,
    assigned_to: data.assigned_to,
    priority: "low",
    recurrence: data.recurrence,
    user_id: user!.id,
    partner_pair: partnerPair!,
  });

  const syncDietCalendarEvent = async (
    data: { description: string; category: string; notes: string; assigned_to: string; log_date: string; event_time: string; recurrence: string },
    previousItem?: DietItem | null,
  ) => {
    if (!user || !partnerPair) return;

    const payload = buildDietCalendarPayload(data);

    if (previousItem) {
      const previousTitle = `🥗 ${previousItem.description}`;
      const { data: existingEvent } = await supabase
        .from("calendar_events")
        .select("id")
        .eq("category", "diet")
        .eq("partner_pair", partnerPair)
        .eq("title", previousTitle)
        .eq("event_date", previousItem.log_date)
        .maybeSingle();

      if (existingEvent?.id) {
        await supabase.from("calendar_events").update(payload).eq("id", existingEvent.id);
        return;
      }
    }

    await supabase.from("calendar_events").insert(payload);
  };

  const addItem = async (data: { description: string; category: string; notes: string; assigned_to: string; calories: number | null; log_date: string; event_time: string; recurrence: string; recurrence_day: number | null }) => {
    if (!user || !partnerPair || saving) return;
    setSaving(true);
    const { data: row, error } = await supabase.from("diet_logs").insert({
      user_id: user.id, partner_pair: partnerPair, meal_type: data.category,
      description: data.description, notes: data.notes || null, assigned_to: data.assigned_to,
      calories: data.calories, log_date: data.log_date, event_time: data.event_time || null,
      recurrence: data.recurrence, recurrence_day: data.recurrence_day,
    }).select().single();
    if (!error && row) {
      setItems(prev => [...prev, row as DietItem]);
      await syncDietCalendarEvent(data);
      setShowForm(false);
      setEditingItem(null);
    }
    setSaving(false);
  };

  const updateItem = async (data: { description: string; category: string; notes: string; assigned_to: string; calories: number | null; log_date: string; event_time: string; recurrence: string; recurrence_day: number | null }) => {
    if (!editingItem || !partnerPair || saving) return;
    setSaving(true);
    const previousItem = editingItem;
    const { error } = await supabase.from("diet_logs").update({
      meal_type: data.category, description: data.description, notes: data.notes || null,
      assigned_to: data.assigned_to, calories: data.calories, log_date: data.log_date,
      event_time: data.event_time || null, recurrence: data.recurrence, recurrence_day: data.recurrence_day,
    }).eq("id", previousItem.id);
    if (!error) {
      setItems(prev => prev.map(i => i.id === previousItem.id ? { ...i, meal_type: data.category, description: data.description, notes: data.notes || null, assigned_to: data.assigned_to, calories: data.calories, log_date: data.log_date, event_time: data.event_time || null, recurrence: data.recurrence, recurrence_day: data.recurrence_day } : i));
      await syncDietCalendarEvent(data, previousItem);
      setShowForm(false);
      setEditingItem(null);
    }
    setSaving(false);
  };

  const toggleComplete = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const next = !item.is_completed;
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_completed: next } : i));
    if (next) setShowConfetti(true);
    await supabase.from("diet_logs").update({ is_completed: next }).eq("id", id);
  };

  const deleteItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase.from("diet_logs").delete().eq("id", id);
    if (item) {
      await supabase
        .from("calendar_events")
        .delete()
        .eq("category", "diet")
        .eq("partner_pair", item.partner_pair)
        .eq("title", `🥗 ${item.description}`)
        .eq("event_date", item.log_date);
    }
  };

  const toggleExpand = (key: string) => {
    setExpandedCats(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const openAdd = (catKey: string) => {
    setEditingItem(null);
    setFormCategory(catKey);
    setShowForm(true);
  };

  const openEdit = (item: DietItem) => {
    setEditingItem(item);
    setFormCategory(item.meal_type);
    setShowForm(true);
  };

  // ─── Derived ───────────────────────────────────────────────────────────────

  const totalItems = items.length;
  const completedItems = items.filter(i => i.is_completed).length;
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-28">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Diet Plan</h1>
            <p className="text-sm text-muted-foreground">Stay healthy together 💚</p>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-card rounded-2xl p-4 shadow-card mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              <p className="text-sm font-bold text-foreground">Daily Progress</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              progressPct === 100 && totalItems > 0 ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
            }`}>
              {completedItems}/{totalItems}
            </span>
          </div>
          <Progress value={progressPct} className="h-2.5 rounded-full" />
          {progressPct === 100 && totalItems > 0 && (
            <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="text-xs text-success font-semibold mt-2 flex items-center gap-1">
              <PartyPopper size={14} /> All done for today! Amazing work! 🎉
            </motion.p>
          )}
        </div>

        {/* Category Sections */}
        {CATEGORIES.map(cat => {
          const catItems = items.filter(i => i.meal_type === cat.key);
          return (
            <CategorySection
              key={cat.key}
              category={cat}
              items={catItems}
              userId={user?.id || ""}
              partnerName={partnerName}
              onToggle={toggleComplete}
              onEdit={openEdit}
              onDelete={deleteItem}
              onAdd={() => openAdd(cat.key)}
              expanded={expandedCats.includes(cat.key)}
              onExpand={() => toggleExpand(cat.key)}
            />
          );
        })}

        {totalItems === 0 && (
          <div className="text-center py-10">
            <span className="text-4xl mb-3 block">🥗</span>
            <p className="text-sm text-muted-foreground mb-1">No diet items for today</p>
            <p className="text-xs text-muted-foreground">Tap + on any category to start planning</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <DietFormModal
            editing={editingItem}
            category={formCategory}
            defaultDate={today}
            onSave={editingItem ? updateItem : addItem}
            onClose={() => { setShowForm(false); setEditingItem(null); }}
          />
        )}
      </AnimatePresence>

      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
      </AnimatePresence>
    </PageTransition>
  );
}
