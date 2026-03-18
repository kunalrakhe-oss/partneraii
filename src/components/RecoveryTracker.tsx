import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Flame, TrendingDown, ChevronRight, ChevronLeft, MessageCircle, Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPair } from "@/hooks/usePartnerPair";
import { format, differenceInDays } from "date-fns";
import { type Exercise } from "@/components/RecoveryPlanCard";

type Phase = {
  title: string;
  description?: string;
  icon?: string;
  durationWeeks?: string;
  week?: string;
  exercises: Exercise[];
  nutritionTips?: Array<{ tip: string; icon: string }>;
  mentalHealth?: { tip: string; icon: string };
};

type SavedPlan = {
  id: string;
  plan_type: string;
  title: string;
  plan_data: any;
  current_phase: number;
  is_active: boolean;
  started_at: string;
  created_at: string;
};

type Props = {
  planType: "physio" | "postpartum";
  accentColor: string; // e.g. "emerald" or "pink"
  onAskAI?: (context: string) => void;
};

export default function RecoveryTracker({ planType, accentColor, onAskAI }: Props) {
  const { user } = useAuth();
  const { partnerPair } = usePartnerPair();
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayProgress, setTodayProgress] = useState<Record<string, boolean>>({});
  const [painLevel, setPainLevel] = useState<number>(5);
  const [dailyNote, setDailyNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [weekProgress, setWeekProgress] = useState<{ date: string; completed: number; total: number }[]>([]);

  const today = format(new Date(), "yyyy-MM-dd");

  // Load active plan
  useEffect(() => {
    if (!user || !partnerPair) { setLoading(false); return; }
    supabase
      .from("recovery_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("plan_type", planType)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setPlan(data as SavedPlan | null);
        setLoading(false);
      });
  }, [user, partnerPair, planType]);

  // Load today's progress
  useEffect(() => {
    if (!plan || !user) return;
    supabase
      .from("recovery_progress")
      .select("exercise_name, completed, pain_level, notes")
      .eq("plan_id", plan.id)
      .eq("user_id", user.id)
      .eq("log_date", today)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const map: Record<string, boolean> = {};
          data.forEach(d => { map[d.exercise_name] = d.completed; });
          setTodayProgress(map);
          const first = data[0];
          if (first.pain_level !== null) setPainLevel(first.pain_level);
          if (first.notes) setDailyNote(first.notes);
        }
      });

    // Load week progress
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    supabase
      .from("recovery_progress")
      .select("log_date, completed")
      .eq("plan_id", plan.id)
      .eq("user_id", user.id)
      .gte("log_date", format(weekAgo, "yyyy-MM-dd"))
      .then(({ data }) => {
        if (!data) return;
        const byDate: Record<string, { completed: number; total: number }> = {};
        data.forEach(d => {
          if (!byDate[d.log_date]) byDate[d.log_date] = { completed: 0, total: 0 };
          byDate[d.log_date].total++;
          if (d.completed) byDate[d.log_date].completed++;
        });
        setWeekProgress(
          Object.entries(byDate)
            .map(([date, v]) => ({ date, ...v }))
            .sort((a, b) => a.date.localeCompare(b.date))
        );
      });
  }, [plan, user, today]);

  const phases: Phase[] = useMemo(() => {
    if (!plan) return [];
    const pd = plan.plan_data;
    return pd.phases || pd.timeline || [];
  }, [plan]);

  const currentPhase = plan ? phases[plan.current_phase] : null;
  const exercises = currentPhase?.exercises || [];
  const dayNumber = plan ? differenceInDays(new Date(), new Date(plan.started_at)) + 1 : 0;

  const completedCount = Object.values(todayProgress).filter(Boolean).length;
  const totalExercises = exercises.length;
  const completionPct = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;

  // Streak calculation
  const streak = useMemo(() => {
    let s = 0;
    const sorted = [...weekProgress].sort((a, b) => b.date.localeCompare(a.date));
    for (const day of sorted) {
      if (day.completed > 0 && day.completed === day.total) s++;
      else break;
    }
    return s;
  }, [weekProgress]);

  const toggleExercise = async (exerciseName: string) => {
    if (!plan || !user || !partnerPair) return;
    const newCompleted = !todayProgress[exerciseName];
    setTodayProgress(prev => ({ ...prev, [exerciseName]: newCompleted }));

    // Upsert progress
    const { data: existing } = await supabase
      .from("recovery_progress")
      .select("id")
      .eq("plan_id", plan.id)
      .eq("user_id", user.id)
      .eq("log_date", today)
      .eq("exercise_name", exerciseName)
      .maybeSingle();

    if (existing) {
      await supabase.from("recovery_progress").update({ completed: newCompleted }).eq("id", existing.id);
    } else {
      await supabase.from("recovery_progress").insert({
        plan_id: plan.id,
        user_id: user.id,
        partner_pair: partnerPair,
        log_date: today,
        phase_index: plan.current_phase,
        exercise_name: exerciseName,
        completed: newCompleted,
        pain_level: painLevel,
      });
    }
  };

  const saveDailyCheckin = async () => {
    if (!plan || !user || !partnerPair) return;
    setSaving(true);

    // Update pain_level and notes on all today's records
    const { data: existing } = await supabase
      .from("recovery_progress")
      .select("id")
      .eq("plan_id", plan.id)
      .eq("user_id", user.id)
      .eq("log_date", today);

    if (existing && existing.length > 0) {
      await supabase
        .from("recovery_progress")
        .update({ pain_level: painLevel, notes: dailyNote || null })
        .eq("plan_id", plan.id)
        .eq("user_id", user.id)
        .eq("log_date", today);
    } else {
      // Create a check-in entry
      await supabase.from("recovery_progress").insert({
        plan_id: plan.id,
        user_id: user.id,
        partner_pair: partnerPair,
        log_date: today,
        phase_index: plan.current_phase,
        exercise_name: "_daily_checkin",
        completed: true,
        pain_level: painLevel,
        notes: dailyNote || null,
      });
    }
    setSaving(false);
  };

  const advancePhase = async () => {
    if (!plan || plan.current_phase >= phases.length - 1) return;
    const newPhase = plan.current_phase + 1;
    await supabase.from("recovery_plans").update({ current_phase: newPhase }).eq("id", plan.id);
    setPlan({ ...plan, current_phase: newPhase });
    setTodayProgress({});
  };

  const goBackPhase = async () => {
    if (!plan || plan.current_phase <= 0) return;
    const newPhase = plan.current_phase - 1;
    await supabase.from("recovery_plans").update({ current_phase: newPhase }).eq("id", plan.id);
    setPlan({ ...plan, current_phase: newPhase });
    setTodayProgress({});
  };

  const deactivatePlan = async () => {
    if (!plan) return;
    await supabase.from("recovery_plans").update({ is_active: false }).eq("id", plan.id);
    setPlan(null);
  };

  const accentBg = accentColor === "pink" ? "bg-pink-500" : "bg-emerald-500";
  const accentBgLight = accentColor === "pink" ? "bg-pink-500/10" : "bg-emerald-500/10";
  const accentText = accentColor === "pink" ? "text-pink-600 dark:text-pink-400" : "text-emerald-600 dark:text-emerald-400";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (!plan) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-4 space-y-5">
      {/* Day counter & streak */}
      <div className="flex items-center gap-3">
        <div className={`w-14 h-14 rounded-2xl ${accentBgLight} flex flex-col items-center justify-center`}>
          <span className="text-lg font-bold text-foreground leading-none">{dayNumber}</span>
          <span className="text-[9px] text-muted-foreground uppercase">Day</span>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground">{plan.title}</h3>
          <p className="text-xs text-muted-foreground">
            Phase {plan.current_phase + 1} of {phases.length}: {currentPhase?.title}
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 bg-orange-500/10 px-2.5 py-1 rounded-full">
            <Flame size={14} className="text-orange-500" />
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{streak}</span>
          </div>
        )}
      </div>

      {/* Today's progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-muted-foreground">Today's Progress</p>
          <p className="text-xs font-bold text-foreground">{completedCount}/{totalExercises}</p>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPct}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full ${accentBg} rounded-full`}
          />
        </div>
        {completionPct === 100 && (
          <p className="text-xs font-medium text-center mt-2 ${accentText}">🎉 All exercises done today!</p>
        )}
      </div>

      {/* Exercise checklist */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Today's Exercises</p>
        {exercises.map((ex, i) => {
          const done = todayProgress[ex.name] || false;
          return (
            <button
              key={i}
              onClick={() => toggleExercise(ex.name)}
              className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl border transition-all ${
                done ? "bg-muted/50 border-border/50" : "bg-card border-border"
              }`}
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                done ? `${accentBg} border-transparent` : "border-border"
              }`}>
                {done && <Check size={14} className="text-white" />}
              </div>
              <span className="text-xl">{ex.icon || "🏋️"}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{ex.name}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {ex.sets && <span>{ex.sets} sets × {ex.reps || "—"}</span>}
                  {ex.holdTime && <span>Hold: {ex.holdTime}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Daily Check-in */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Daily Check-in</p>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Pain Level</span>
            <div className="flex items-center gap-1">
              <TrendingDown size={12} className="text-muted-foreground" />
              <span className={`text-sm font-bold ${painLevel <= 3 ? "text-green-500" : painLevel <= 6 ? "text-amber-500" : "text-red-500"}`}>
                {painLevel}/10
              </span>
            </div>
          </div>
          <Slider
            value={[painLevel]}
            onValueChange={([v]) => setPainLevel(v)}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>No pain</span>
            <span>Severe</span>
          </div>
        </div>
        <textarea
          value={dailyNote}
          onChange={e => setDailyNote(e.target.value)}
          placeholder="How are you feeling today? Any changes?"
          rows={2}
          className="w-full bg-muted rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={saveDailyCheckin}
          disabled={saving}
          className={`w-full ${accentBg} text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2`}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          Save Check-in
        </button>
      </div>

      {/* Week mini-chart */}
      {weekProgress.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">This Week</p>
          <div className="flex items-end gap-1.5 h-16">
            {weekProgress.map((day, i) => {
              const pct = day.total > 0 ? (day.completed / day.total) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-muted rounded-full overflow-hidden" style={{ height: "48px" }}>
                    <div
                      className={`w-full ${accentBg} rounded-full transition-all`}
                      style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {format(new Date(day.date + "T00:00:00"), "EEE").slice(0, 2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Phase Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={goBackPhase}
          disabled={!plan || plan.current_phase <= 0}
          className="flex-1 flex items-center justify-center gap-1 bg-muted text-foreground rounded-xl py-2.5 text-sm font-medium disabled:opacity-30"
        >
          <ChevronLeft size={16} /> Previous Phase
        </button>
        <button
          onClick={advancePhase}
          disabled={!plan || plan.current_phase >= phases.length - 1}
          className={`flex-1 flex items-center justify-center gap-1 ${accentBg} text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-30`}
        >
          Next Phase <ChevronRight size={16} />
        </button>
      </div>

      {/* AI Context Button */}
      {onAskAI && (
        <button
          onClick={() => onAskAI(
            `I'm on Day ${dayNumber} of my ${planType} recovery plan. Currently in Phase ${plan!.current_phase + 1}: "${currentPhase?.title}". ` +
            `Today I completed ${completedCount}/${totalExercises} exercises. My pain level is ${painLevel}/10. ` +
            (dailyNote ? `Notes: "${dailyNote}". ` : "") +
            `Current streak: ${streak} days. Please give me personalized advice.`
          )}
          className="w-full flex items-center justify-center gap-2 bg-muted text-foreground rounded-xl py-2.5 text-sm font-medium hover:bg-muted/80 transition-colors"
        >
          <MessageCircle size={14} />
          Get AI Recovery Advice
        </button>
      )}

      {/* End plan */}
      <button
        onClick={deactivatePlan}
        className="w-full text-center text-xs text-muted-foreground hover:text-destructive py-2 transition-colors"
      >
        End this recovery plan
      </button>
    </motion.div>
  );
}
