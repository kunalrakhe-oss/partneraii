import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft, Plus, Check, Trash2, Edit3, X, ChevronDown, ChevronRight,
  Sparkles, PartyPopper, Users, User, Heart, CalendarDays, Clock, Repeat,
  Bot, Loader2, Upload, Target, Flame, TrendingUp, Image as ImageIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useAppMode } from "@/hooks/useAppMode";

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

interface DietPlan {
  id: string;
  title: string;
  goal: string;
  plan_data: any;
  is_active: boolean;
  started_at: string;
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

const GOALS = [
  { value: "weight_loss", label: "Lose Weight", emoji: "🏃" },
  { value: "muscle_gain", label: "Build Muscle", emoji: "💪" },
  { value: "maintain", label: "Maintain", emoji: "⚖️" },
  { value: "healthy_eating", label: "Eat Healthy", emoji: "🥗" },
];

const DIET_PREFS = [
  { value: "no_preference", label: "No Preference" },
  { value: "vegetarian", label: "Vegetarian 🥬" },
  { value: "vegan", label: "Vegan 🌱" },
  { value: "non_veg", label: "Non-Veg 🍗" },
  { value: "eggetarian", label: "Eggetarian 🥚" },
];

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
  isSingle?: boolean;
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

          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Food Name</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Warm lemon water"
            className="w-full h-11 bg-muted rounded-2xl px-4 text-sm text-foreground placeholder:text-muted-foreground border-none focus:outline-none focus:ring-2 focus:ring-ring mb-4" />

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

          {!isSingle && (
            <>
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

// ─── Create Plan Tab ─────────────────────────────────────────────────────────

function CreatePlanTab({
  onPlanCreated,
}: {
  onPlanCreated: (plan: DietPlan) => void;
}) {
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [goal, setGoal] = useState("weight_loss");
  const [preference, setPreference] = useState("no_preference");
  const [restrictions, setRestrictions] = useState("");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsedUpload, setParsedUpload] = useState<any>(null);

  const generatePlan = async () => {
    if (generating) return;
    setGenerating(true);
    setGeneratedPlan(null);
    try {
      const { data, error } = await supabase.functions.invoke("dietbot-chat", {
        body: {
          type: "plan",
          goal,
          preferences: preference,
          restrictions,
          activityLevel,
          language: localStorage.getItem("lovelist-language") || "en",
        },
      });
      if (error) throw error;
      if (data?.plan) setGeneratedPlan(data.plan);
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to generate plan", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setParsedUpload(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("dietbot-chat", {
        body: {
          type: "parse_upload",
          imageBase64: base64,
          language: localStorage.getItem("lovelist-language") || "en",
        },
      });
      if (error) throw error;
      if (data?.parsed) {
        setParsedUpload(data.parsed);
        // Convert parsed meals to a plan-like structure
        setGeneratedPlan({
          title: data.parsed.summary || "My Uploaded Diet Plan",
          goal: data.parsed.detected_goal || goal,
          daily_calories: data.parsed.meals?.reduce((s: number, m: any) => s + (m.calories || 0), 0) || 0,
          days: [{ day: "Daily Plan", meals: data.parsed.meals || [] }],
          tips: [],
        });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to parse uploaded plan", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const savePlan = async () => {
    if (!user || !partnerPair || !generatedPlan || saving) return;
    setSaving(true);
    try {
      // Deactivate existing plans
      await supabase.from("diet_plans").update({ is_active: false } as any).eq("user_id", user.id).eq("is_active", true);

      const { data, error } = await supabase.from("diet_plans").insert({
        user_id: user.id,
        partner_pair: partnerPair,
        title: generatedPlan.title || "My Diet Plan",
        goal: generatedPlan.goal || goal,
        plan_data: generatedPlan,
        is_active: true,
      } as any).select().single();

      if (error) throw error;
      toast({ title: "Plan saved! 🎉", description: "Your diet transformation starts now." });
      onPlanCreated(data as any);
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to save plan", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {!generatedPlan ? (
        <>
          {/* Goal */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">🎯 Your Goal</label>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map(g => (
                <button key={g.value} onClick={() => setGoal(g.value)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                    goal === g.value ? "bg-primary/20 ring-2 ring-primary text-foreground" : "bg-card border border-border text-muted-foreground"
                  }`}>
                  <span>{g.emoji}</span> {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Diet Preference */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">🥗 Diet Preference</label>
            <div className="flex flex-wrap gap-2">
              {DIET_PREFS.map(p => (
                <button key={p.value} onClick={() => setPreference(p.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    preference === p.value ? "bg-primary/20 ring-2 ring-primary text-foreground" : "bg-card border border-border text-muted-foreground"
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">🏃 Activity Level</label>
            <div className="flex gap-2">
              {["sedentary", "moderate", "active", "very_active"].map(l => (
                <button key={l} onClick={() => setActivityLevel(l)}
                  className={`flex-1 px-2 py-2.5 rounded-xl text-[10px] font-semibold transition-all capitalize ${
                    activityLevel === l ? "bg-primary/20 ring-2 ring-primary text-foreground" : "bg-card border border-border text-muted-foreground"
                  }`}>
                  {l.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Restrictions */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">⚠️ Allergies / Restrictions</label>
            <input value={restrictions} onChange={e => setRestrictions(e.target.value)} placeholder="e.g. No dairy, gluten-free"
              className="w-full h-11 bg-muted rounded-2xl px-4 text-sm text-foreground placeholder:text-muted-foreground border-none focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button onClick={generatePlan} disabled={generating}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
              {generating ? "Generating 7-Day Plan..." : "Generate AI Diet Plan"}
            </button>

            <div className="relative flex items-center">
              <div className="flex-1 h-px bg-border" />
              <span className="px-3 text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="w-full h-12 rounded-2xl bg-card border-2 border-dashed border-border text-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? "Parsing your plan..." : "Upload Your Plan (Image/PDF)"}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
          </div>
        </>
      ) : (
        /* Generated Plan Preview */
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-primary/10 via-card to-secondary/10 rounded-2xl p-4 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-bold text-foreground">{generatedPlan.title}</h3>
                <p className="text-xs text-muted-foreground">{generatedPlan.daily_calories} cal/day · {generatedPlan.days?.length || 0} days</p>
              </div>
              <button onClick={() => setGeneratedPlan(null)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>

            {/* Tips */}
            {generatedPlan.tips?.length > 0 && (
              <div className="space-y-1 mt-3">
                {generatedPlan.tips.map((tip: string, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground">💡 {tip}</p>
                ))}
              </div>
            )}
          </div>

          {/* Days preview */}
          {generatedPlan.days?.map((day: any, di: number) => (
            <div key={di} className="bg-card rounded-2xl p-4 border border-border">
              <p className="text-sm font-bold text-foreground mb-3">{day.day}</p>
              <div className="space-y-2">
                {day.meals?.map((meal: any, mi: number) => {
                  const cat = CATEGORIES.find(c => c.key === meal.meal_type);
                  return (
                    <div key={mi} className="flex items-center gap-3">
                      <span className="text-base">{meal.emoji || cat?.emoji || "🍽️"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{meal.description}</p>
                        <p className="text-[10px] text-muted-foreground">{cat?.label || meal.meal_type} · {meal.calories} cal</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Save Button */}
          <button onClick={savePlan} disabled={saving}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
            {saving ? "Saving..." : "Save & Start Tracking"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── My Plan Tab ─────────────────────────────────────────────────────────────

function MyPlanTab({
  plan,
  items,
  userId,
  partnerPair,
  onEndPlan,
}: {
  plan: DietPlan;
  items: DietItem[];
  userId: string;
  partnerPair: string;
  onEndPlan: () => void;
}) {
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");
  const dayNumber = Math.max(1, differenceInDays(new Date(), new Date(plan.started_at)) + 1);
  const planData = plan.plan_data as any;
  const dayIndex = (dayNumber - 1) % (planData?.days?.length || 1);
  const todayPlan = planData?.days?.[dayIndex];

  // Get today's items
  const todayItems = items.filter(i => i.log_date === today);
  const completedToday = todayItems.filter(i => i.is_completed).length;
  const totalToday = todayItems.length;
  const progressPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  // Auto-populate today's diet_logs from plan if none exist
  const [populated, setPopulated] = useState(false);
  useEffect(() => {
    if (populated || !todayPlan?.meals || todayItems.length > 0 || !userId || !partnerPair) return;
    setPopulated(true);

    const entries = todayPlan.meals.map((meal: any) => ({
      user_id: userId,
      partner_pair: partnerPair,
      meal_type: meal.meal_type,
      description: meal.description,
      calories: meal.calories || null,
      notes: meal.notes || null,
      assigned_to: "me",
      log_date: today,
      recurrence: "once",
    }));

    if (entries.length > 0) {
      supabase.from("diet_logs").insert(entries).then(({ error }) => {
        if (error) console.error("Auto-populate error:", error);
      });
    }
  }, [todayPlan, todayItems.length, userId, partnerPair, today, populated]);

  const [ending, setEnding] = useState(false);
  const handleEndPlan = async () => {
    setEnding(true);
    await supabase.from("diet_plans").update({ is_active: false } as any).eq("id", plan.id);
    toast({ title: "Plan ended", description: "You can create a new plan anytime." });
    setEnding(false);
    onEndPlan();
  };

  return (
    <div className="space-y-4">
      {/* Plan Header */}
      <div className="bg-gradient-to-r from-primary/10 via-card to-secondary/10 rounded-2xl p-4 border border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-bold text-foreground">{plan.title}</h3>
            <p className="text-xs text-muted-foreground">{planData?.goal || plan.goal} · {planData?.daily_calories || "—"} cal/day</p>
          </div>
          <div className="flex items-center gap-1 bg-primary/15 px-2.5 py-1 rounded-full">
            <Flame size={12} className="text-primary" />
            <span className="text-xs font-bold text-primary">Day {dayNumber}</span>
          </div>
        </div>
        <Progress value={progressPct} className="h-2.5 rounded-full" />
        <p className="text-[10px] text-muted-foreground mt-1.5">{completedToday}/{totalToday} meals completed today</p>
      </div>

      {/* Today's plan label */}
      {todayPlan && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          📅 {todayPlan.day || `Day ${dayNumber}`}
        </p>
      )}

      {/* Today's meals from diet_logs will be shown in the parent Today tab */}
      {totalToday === 0 && (
        <div className="text-center py-8">
          <Loader2 size={20} className="animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Loading today's plan meals...</p>
        </div>
      )}

      {progressPct === 100 && totalToday > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-success/10 rounded-2xl p-4 border border-success/20 text-center">
          <PartyPopper size={24} className="text-success mx-auto mb-2" />
          <p className="text-sm font-bold text-foreground">All meals done! 🎉</p>
          <p className="text-xs text-muted-foreground">Day {dayNumber} complete. Keep it up!</p>
        </motion.div>
      )}

      {/* Weekly adherence */}
      <div className="bg-card rounded-2xl p-4 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-primary" />
          <p className="text-sm font-bold text-foreground">Weekly Progress</p>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 7 }, (_, i) => {
            const dayNum = dayNumber - (new Date().getDay()) + i;
            const isToday = i === new Date().getDay();
            const isPast = dayNum > 0 && dayNum < dayNumber;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full h-8 rounded-lg ${
                  isToday ? (progressPct === 100 ? "bg-success/30" : "bg-primary/20 ring-1 ring-primary") :
                  isPast ? "bg-success/20" : "bg-muted"
                }`} />
                <span className="text-[9px] text-muted-foreground">{DAY_LABELS[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* End Plan */}
      <button onClick={handleEndPlan} disabled={ending}
        className="w-full h-10 rounded-2xl bg-destructive/10 text-destructive text-xs font-semibold disabled:opacity-50">
        {ending ? "Ending..." : "End Plan"}
      </button>
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

  // Plan
  const [activePlan, setActivePlan] = useState<DietPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("today");

  const today = format(new Date(), "yyyy-MM-dd");

  // ─── Fetch active plan ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setPlanLoading(false); return; }
    supabase.from("diet_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setActivePlan(data as any);
          setActiveTab("my-plan");
        }
        setPlanLoading(false);
      });
  }, [user]);

  // ─── Fetch diet logs ──────────────────────────────────────────────────────

  const fetchItems = useCallback(() => {
    if (!partnerPair) return;
    const dayOfWeek = new Date().getDay();
    supabase.from("diet_logs").select("*").eq("partner_pair", partnerPair)
      .or(`log_date.eq.${today},recurrence.eq.daily,and(recurrence.eq.weekly,recurrence_day.eq.${dayOfWeek})`)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setItems(data as DietItem[]); });
  }, [partnerPair, today]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

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
          if (newItem.partner_pair === partnerPair) {
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
  }, [partnerPair]);

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
        .from("calendar_events").select("id").eq("category", "diet").eq("partner_pair", partnerPair)
        .eq("title", previousTitle).eq("event_date", previousItem.log_date).maybeSingle();
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
      await supabase.from("calendar_events").delete().eq("category", "diet")
        .eq("partner_pair", item.partner_pair).eq("title", `🥗 ${item.description}`).eq("event_date", item.log_date);
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

  const getAiDietSuggestions = async () => {
    if (aiSuggesting) return;
    setAiSuggesting(true);
    setAiSuggestions(null);
    try {
      const { data, error } = await supabase.functions.invoke("dietbot-chat", {
        body: {
          type: "suggest",
          currentItems: items.map(i => ({ meal_type: i.meal_type, description: i.description, calories: i.calories })),
          language: localStorage.getItem("lovelist-language") || "en",
        },
      });
      if (error) throw error;
      if (data?.plan) {
        setAiSuggestions(data.plan.suggestions || []);
        setAiTip(data.plan.tip || "");
      }
    } catch (e) {
      console.error("AI diet error:", e);
      toast({ title: "AI suggestion failed", description: "Please try again later.", variant: "destructive" });
    } finally {
      setAiSuggesting(false);
    }
  };

  const addAiSuggestion = async (suggestion: { meal_type: string; description: string; calories: number; notes?: string }) => {
    if (!user || !partnerPair) return;
    const { data: row, error } = await supabase.from("diet_logs").insert({
      user_id: user.id, partner_pair: partnerPair, meal_type: suggestion.meal_type,
      description: suggestion.description, notes: suggestion.notes || null, assigned_to: "me",
      calories: suggestion.calories, log_date: today, recurrence: "once",
    }).select().single();
    if (!error && row) {
      setItems(prev => [...prev, row as DietItem]);
      toast({ title: "Added! ✅", description: suggestion.description });
    }
  };

  const totalItems = items.filter(i => i.log_date === today || i.recurrence !== "once").length;
  const completedItems = items.filter(i => i.is_completed).length;
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <PageTransition>
      <div className="px-5 pb-28">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background -mx-5 px-5 pt-10 pb-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Diet Plan</h1>
            <p className="text-sm text-muted-foreground">Stay healthy together 💚</p>
          </div>
          <button onClick={getAiDietSuggestions} disabled={aiSuggesting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold disabled:opacity-50">
            {aiSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
            AI Diet
          </button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-5">
          <TabsList className="w-full">
            <TabsTrigger value="today" className="flex-1 text-xs">Today</TabsTrigger>
            {activePlan && <TabsTrigger value="my-plan" className="flex-1 text-xs">My Plan</TabsTrigger>}
            <TabsTrigger value="create" className="flex-1 text-xs">Create Plan</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
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

            {/* AI Suggestions Panel */}
            <AnimatePresence>
              {aiSuggestions && aiSuggestions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="bg-gradient-to-r from-primary/10 via-card to-secondary/10 rounded-2xl p-4 border border-primary/20 mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bot size={16} className="text-primary" />
                      <p className="text-sm font-bold text-foreground">AI Diet Suggestions</p>
                    </div>
                    <button onClick={() => setAiSuggestions(null)} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <X size={12} className="text-muted-foreground" />
                    </button>
                  </div>
                  {aiTip && (
                    <p className="text-xs text-muted-foreground mb-3 bg-muted/50 rounded-xl px-3 py-2">💡 {aiTip}</p>
                  )}
                  <div className="space-y-2">
                    {aiSuggestions.map((s, i) => {
                      const catLabel = CATEGORIES.find(c => c.key === s.meal_type)?.label || s.meal_type;
                      const alreadyAdded = items.some(item => item.description.toLowerCase() === s.description.toLowerCase() && item.meal_type === s.meal_type);
                      return (
                        <div key={i} className="flex items-center gap-3 bg-card rounded-xl px-3 py-2.5 border border-border/50">
                          <span className="text-lg">{s.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{s.description}</p>
                            <p className="text-[10px] text-muted-foreground">{catLabel} · {s.calories} cal{s.notes ? ` · ${s.notes}` : ""}</p>
                          </div>
                          <button
                            onClick={() => addAiSuggestion(s)}
                            disabled={alreadyAdded}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                              alreadyAdded ? "bg-success/20" : "bg-primary/10 hover:bg-primary/20"
                            }`}>
                            {alreadyAdded ? <Check size={12} className="text-success" /> : <Plus size={12} className="text-primary" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
          </TabsContent>

          {activePlan && (
            <TabsContent value="my-plan">
              <MyPlanTab
                plan={activePlan}
                items={items}
                userId={user?.id || ""}
                partnerPair={partnerPair || ""}
                onEndPlan={() => { setActivePlan(null); setActiveTab("today"); }}
              />
            </TabsContent>
          )}

          <TabsContent value="create">
            <CreatePlanTab
              onPlanCreated={(plan) => {
                setActivePlan(plan);
                setActiveTab("my-plan");
                // Refresh items after plan populates
                setTimeout(fetchItems, 2000);
              }}
            />
          </TabsContent>
        </Tabs>
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
