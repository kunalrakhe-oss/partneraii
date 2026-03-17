import { useState, useEffect } from "react";
import { ArrowLeft, Dumbbell, Plus, Flame, Clock, Trash2, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const WORKOUT_TYPES = [
  { label: "Running", emoji: "🏃" },
  { label: "Gym", emoji: "🏋️" },
  { label: "Yoga", emoji: "🧘" },
  { label: "Swimming", emoji: "🏊" },
  { label: "Cycling", emoji: "🚴" },
  { label: "Walking", emoji: "🚶" },
  { label: "HIIT", emoji: "⚡" },
  { label: "Dance", emoji: "💃" },
  { label: "Sports", emoji: "⚽" },
  { label: "Other", emoji: "🏆" },
];

interface Workout {
  id: string;
  user_id: string;
  type: string;
  duration_minutes: number;
  notes: string | null;
  workout_date: string;
  created_at: string;
}

export default function WorkoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState("Running");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [partnerName, setPartnerName] = useState("Partner");

  useEffect(() => {
    if (!partnerPair) return;
    supabase.from("workouts").select("*").eq("partner_pair", partnerPair)
      .order("workout_date", { ascending: false }).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setWorkouts(data as Workout[]); });
  }, [partnerPair]);

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

  const addWorkout = async () => {
    if (!user || !partnerPair || saving) return;
    setSaving(true);
    const { data, error } = await supabase.from("workouts").insert({
      user_id: user.id, partner_pair: partnerPair, type, duration_minutes: duration,
      notes: notes.trim() || null, workout_date: format(new Date(), "yyyy-MM-dd"),
    }).select().single();
    if (!error && data) {
      setWorkouts(prev => [data as Workout, ...prev]);
      setShowAdd(false); setType("Running"); setDuration(30); setNotes("");
    }
    setSaving(false);
  };

  const deleteWorkout = async (id: string) => {
    await supabase.from("workouts").delete().eq("id", id);
    setWorkouts(prev => prev.filter(w => w.id !== id));
  };

  const myWorkouts = workouts.filter(w => w.user_id === user?.id);
  const partnerWorkouts = workouts.filter(w => w.user_id !== user?.id);
  const todayCount = myWorkouts.filter(w => w.workout_date === format(new Date(), "yyyy-MM-dd")).length;
  const totalMinutes = myWorkouts.reduce((s, w) => s + w.duration_minutes, 0);

  const getEmoji = (t: string) => WORKOUT_TYPES.find(wt => wt.label === t)?.emoji || "🏆";

  return (
    <PageTransition>
      <div className="px-5 pt-10 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Workout</h1>
            <p className="text-sm text-muted-foreground">Stay fit together 💪</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Today", value: todayCount, icon: Flame, color: "text-destructive" },
            { label: "Total Min", value: totalMinutes, icon: Clock, color: "text-primary" },
            { label: "Workouts", value: myWorkouts.length, icon: Trophy, color: "text-secondary" },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-2xl p-3 shadow-card text-center">
              <s.icon size={18} className={`${s.color} mx-auto mb-1`} />
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Add Button */}
        <button onClick={() => setShowAdd(true)} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 mb-6 shadow-soft">
          <Plus size={18} /> Log Workout
        </button>

        {/* Add Form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
              <div className="bg-card rounded-2xl p-4 shadow-card border border-border space-y-4">
                <p className="text-sm font-bold text-foreground">New Workout</p>
                <div className="grid grid-cols-5 gap-2">
                  {WORKOUT_TYPES.map(wt => (
                    <button key={wt.label} onClick={() => setType(wt.label)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition-all ${type === wt.label ? "bg-primary/20 ring-2 ring-primary" : "bg-muted"}`}>
                      <span className="text-lg">{wt.emoji}</span>
                      <span className="text-[10px] text-foreground">{wt.label}</span>
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Duration (min)</label>
                  <div className="flex gap-2">
                    {[15, 30, 45, 60, 90].map(d => (
                      <button key={d} onClick={() => setDuration(d)}
                        className={`flex-1 h-9 rounded-xl text-xs font-semibold transition-all ${duration === d ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)"
                  className="w-full h-10 bg-muted rounded-xl px-3 text-sm text-foreground placeholder:text-muted-foreground border-none focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="flex gap-2">
                  <button onClick={() => setShowAdd(false)} className="flex-1 h-10 rounded-xl bg-muted text-foreground text-sm font-semibold">Cancel</button>
                  <button onClick={addWorkout} disabled={saving} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40">
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My Workouts */}
        <div className="mb-6">
          <p className="text-sm font-bold text-foreground mb-3">My Workouts</p>
          {myWorkouts.length === 0 ? (
            <div className="bg-card rounded-2xl p-4 shadow-card text-center">
              <Dumbbell size={24} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No workouts yet. Start logging!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myWorkouts.map(w => (
                <div key={w.id} className="bg-card rounded-2xl px-4 py-3 shadow-card flex items-center gap-3">
                  <span className="text-xl">{getEmoji(w.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{w.type}</p>
                    <p className="text-xs text-muted-foreground">{w.duration_minutes} min · {format(new Date(w.workout_date), "MMM d")}</p>
                    {w.notes && <p className="text-xs text-muted-foreground/70 truncate">{w.notes}</p>}
                  </div>
                  <button onClick={() => deleteWorkout(w.id)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Trash2 size={14} className="text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Partner Workouts */}
        <div>
          <p className="text-sm font-bold text-foreground mb-3">{partnerName}'s Workouts</p>
          {partnerWorkouts.length === 0 ? (
            <div className="bg-card rounded-2xl p-4 shadow-card text-center">
              <p className="text-sm text-muted-foreground">No workouts from {partnerName} yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {partnerWorkouts.map(w => (
                <div key={w.id} className="bg-card rounded-2xl px-4 py-3 shadow-card flex items-center gap-3">
                  <span className="text-xl">{getEmoji(w.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{w.type}</p>
                    <p className="text-xs text-muted-foreground">{w.duration_minutes} min · {format(new Date(w.workout_date), "MMM d")}</p>
                    {w.notes && <p className="text-xs text-muted-foreground/70 truncate">{w.notes}</p>}
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
