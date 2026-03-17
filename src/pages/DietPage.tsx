import { useState, useEffect } from "react";
import { ArrowLeft, Apple, Plus, Trash2, Droplets, Coffee, UtensilsCrossed, Cookie } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const MEAL_TYPES = [
  { label: "Breakfast", emoji: "🥣", icon: Coffee },
  { label: "Lunch", emoji: "🥗", icon: UtensilsCrossed },
  { label: "Dinner", emoji: "🍽️", icon: UtensilsCrossed },
  { label: "Snack", emoji: "🍎", icon: Cookie },
];

interface DietLog {
  id: string;
  user_id: string;
  meal_type: string;
  description: string;
  calories: number | null;
  log_date: string;
  created_at: string;
}

export default function DietPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();
  const [logs, setLogs] = useState<DietLog[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [mealType, setMealType] = useState("Lunch");
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("");
  const [saving, setSaving] = useState(false);
  const [partnerName, setPartnerName] = useState("Partner");
  const [waterCount, setWaterCount] = useState(0);

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!partnerPair) return;
    supabase.from("diet_logs").select("*").eq("partner_pair", partnerPair)
      .order("log_date", { ascending: false }).order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => { if (data) setLogs(data as DietLog[]); });
  }, [partnerPair]);

  useEffect(() => {
    if (!user) return;
    // Load water count from localStorage
    const saved = localStorage.getItem(`water-${user.id}-${today}`);
    if (saved) setWaterCount(parseInt(saved));

    supabase.from("profiles").select("partner_id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.partner_id) {
          supabase.from("profiles").select("display_name").eq("id", data.partner_id).maybeSingle()
            .then(({ data: p }) => { if (p?.display_name) setPartnerName(p.display_name.split(" ")[0]); });
        }
      });
  }, [user, today]);

  const addLog = async () => {
    if (!user || !partnerPair || !description.trim() || saving) return;
    setSaving(true);
    const { data, error } = await supabase.from("diet_logs").insert({
      user_id: user.id, partner_pair: partnerPair, meal_type: mealType,
      description: description.trim(), calories: calories ? parseInt(calories) : null, log_date: today,
    }).select().single();
    if (!error && data) {
      setLogs(prev => [data as DietLog, ...prev]);
      setShowAdd(false); setDescription(""); setCalories(""); setMealType("Lunch");
    }
    setSaving(false);
  };

  const deleteLog = async (id: string) => {
    await supabase.from("diet_logs").delete().eq("id", id);
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const addWater = () => {
    const next = waterCount + 1;
    setWaterCount(next);
    if (user) localStorage.setItem(`water-${user.id}-${today}`, String(next));
  };

  const myLogs = logs.filter(l => l.user_id === user?.id);
  const partnerLogs = logs.filter(l => l.user_id !== user?.id);
  const todayLogs = myLogs.filter(l => l.log_date === today);
  const todayCals = todayLogs.reduce((s, l) => s + (l.calories || 0), 0);

  const getMealEmoji = (t: string) => MEAL_TYPES.find(mt => mt.label === t)?.emoji || "🍽️";

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Diet</h1>
            <p className="text-sm text-muted-foreground">Eat well together 🥗</p>
          </div>
        </div>

        {/* Today's Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card rounded-2xl p-3 shadow-card text-center">
            <UtensilsCrossed size={18} className="text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{todayLogs.length}</p>
            <p className="text-[10px] text-muted-foreground">Meals Today</p>
          </div>
          <div className="bg-card rounded-2xl p-3 shadow-card text-center">
            <Apple size={18} className="text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{todayCals || "—"}</p>
            <p className="text-[10px] text-muted-foreground">Calories</p>
          </div>
          <button onClick={addWater} className="bg-card rounded-2xl p-3 shadow-card text-center active:scale-95 transition-transform">
            <Droplets size={18} className="text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{waterCount}</p>
            <p className="text-[10px] text-muted-foreground">Water 💧</p>
          </button>
        </div>

        {/* Add Button */}
        <button onClick={() => setShowAdd(true)} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 mb-6 shadow-soft">
          <Plus size={18} /> Log Meal
        </button>

        {/* Add Form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
              <div className="bg-card rounded-2xl p-4 shadow-card border border-border space-y-4">
                <p className="text-sm font-bold text-foreground">Log a Meal</p>
                <div className="grid grid-cols-4 gap-2">
                  {MEAL_TYPES.map(mt => (
                    <button key={mt.label} onClick={() => setMealType(mt.label)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs transition-all ${mealType === mt.label ? "bg-primary/20 ring-2 ring-primary" : "bg-muted"}`}>
                      <span className="text-lg">{mt.emoji}</span>
                      <span className="text-[10px] text-foreground">{mt.label}</span>
                    </button>
                  ))}
                </div>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What did you eat?"
                  className="w-full h-10 bg-muted rounded-xl px-3 text-sm text-foreground placeholder:text-muted-foreground border-none focus:outline-none focus:ring-2 focus:ring-ring" />
                <input value={calories} onChange={e => setCalories(e.target.value.replace(/\D/g, ""))} placeholder="Calories (optional)"
                  className="w-full h-10 bg-muted rounded-xl px-3 text-sm text-foreground placeholder:text-muted-foreground border-none focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="flex gap-2">
                  <button onClick={() => setShowAdd(false)} className="flex-1 h-10 rounded-xl bg-muted text-foreground text-sm font-semibold">Cancel</button>
                  <button onClick={addLog} disabled={!description.trim() || saving} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40">
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My Meals */}
        <div className="mb-6">
          <p className="text-sm font-bold text-foreground mb-3">My Meals</p>
          {myLogs.length === 0 ? (
            <div className="bg-card rounded-2xl p-4 shadow-card text-center">
              <Apple size={24} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No meals logged yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myLogs.map(l => (
                <div key={l.id} className="bg-card rounded-2xl px-4 py-3 shadow-card flex items-center gap-3">
                  <span className="text-xl">{getMealEmoji(l.meal_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{l.description}</p>
                    <p className="text-xs text-muted-foreground">{l.meal_type} · {format(new Date(l.log_date), "MMM d")}{l.calories ? ` · ${l.calories} cal` : ""}</p>
                  </div>
                  <button onClick={() => deleteLog(l.id)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Trash2 size={14} className="text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Partner Meals */}
        <div>
          <p className="text-sm font-bold text-foreground mb-3">{partnerName}'s Meals</p>
          {partnerLogs.length === 0 ? (
            <div className="bg-card rounded-2xl p-4 shadow-card text-center">
              <p className="text-sm text-muted-foreground">No meals from {partnerName} yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {partnerLogs.map(l => (
                <div key={l.id} className="bg-card rounded-2xl px-4 py-3 shadow-card flex items-center gap-3">
                  <span className="text-xl">{getMealEmoji(l.meal_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{l.description}</p>
                    <p className="text-xs text-muted-foreground">{l.meal_type} · {format(new Date(l.log_date), "MMM d")}{l.calories ? ` · ${l.calories} cal` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
