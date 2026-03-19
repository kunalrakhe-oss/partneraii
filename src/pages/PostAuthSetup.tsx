import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { User, Users, ArrowRight, Check, Loader2, Heart, Dumbbell, Wallet, Brain, Zap, Coffee, Sun, Target, CalendarDays, Sparkles, X } from "lucide-react";

type Step = "mode" | "name" | "priorities" | "morning" | "goals";

const GOAL_SUGGESTIONS = [
  "Lose weight", "Build muscle", "Eat healthier", "Save money",
  "Manage knee pain", "Run a marathon", "Sleep better", "Reduce stress",
  "Improve relationship", "Get organized",
];

const PRIORITY_OPTIONS = [
  { id: "health", label: "Health & Fitness", icon: Dumbbell, color: "text-green-500" },
  { id: "finance", label: "Financial Goals", icon: Wallet, color: "text-amber-500" },
  { id: "relationship", label: "Relationship", icon: Heart, color: "text-pink-500" },
  { id: "productivity", label: "Productivity", icon: Target, color: "text-blue-500" },
  { id: "wellness", label: "Mental Wellness", icon: Brain, color: "text-purple-500" },
] as const;

const MORNING_OPTIONS = [
  { id: "rushed", label: "Rushed & Busy", emoji: "⚡", desc: "I hit the ground running" },
  { id: "relaxed", label: "Slow & Relaxed", emoji: "☕", desc: "I ease into the day" },
  { id: "workout", label: "Workout First", emoji: "💪", desc: "Exercise starts my day" },
  { id: "planning", label: "Plan & Organize", emoji: "📋", desc: "I map out my day ahead" },
] as const;

export default function PostAuthSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<"single" | "couple" | null>(() => {
    const saved = localStorage.getItem("lovelist-app-mode");
    return saved === "single" || saved === "couple" ? saved : null;
  });
  const rawName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.name ||
    "";
  const looksLikeRealName = rawName.length > 0 && /[a-zA-Z]{2,}/.test(rawName) && !/^[a-z0-9]{8,}$/i.test(rawName);
  const [name, setName] = useState(looksLikeRealName ? rawName : "");
  const [saving, setSaving] = useState(false);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [morningRoutine, setMorningRoutine] = useState<string | null>(null);
  const [lifeGoals, setLifeGoals] = useState<string[]>([]);
  const [goalInput, setGoalInput] = useState("");

  const togglePriority = (id: string) => {
    setPriorities(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleFinish = async () => {
    if (!user || !mode) return;
    setSaving(true);
    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        toast({ title: "Please enter your name", variant: "destructive" });
        setSaving(false);
        return;
      }
      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({ app_mode: mode, display_name: trimmedName })
        .eq("user_id", user.id);
      if (error) throw error;

      // Save preferences
      const { error: prefError } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          priorities,
          morning_routine: morningRoutine,
          daily_goals: priorities,
          life_goals: lifeGoals,
        } as any, { onConflict: "user_id" });
      if (prefError) console.error("Preferences save error:", prefError);

      localStorage.setItem("lovelist-setup-done", "true");

      if (mode === "couple") {
        navigate("/connect", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const anim = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6">
      <AnimatePresence mode="wait">
        {step === "mode" && (
          <motion.div key="mode" {...anim} className="w-full max-w-sm space-y-6 text-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">How will you use PartnerAI?</h1>
              <p className="text-sm text-muted-foreground">You can change this anytime in settings</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setMode("single")}
                className={`w-full flex items-center gap-4 rounded-2xl px-5 py-5 border-2 transition-all ${
                  mode === "single" ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode === "single" ? "bg-primary/10" : "bg-muted"}`}>
                  <User size={22} className={mode === "single" ? "text-primary" : "text-muted-foreground"} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-bold text-foreground">Me Mode</p>
                  <p className="text-xs text-muted-foreground">Personal productivity & wellness</p>
                </div>
                {mode === "single" && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check size={14} className="text-primary-foreground" />
                  </div>
                )}
              </button>
              <button
                onClick={() => setMode("couple")}
                className={`w-full flex items-center gap-4 rounded-2xl px-5 py-5 border-2 transition-all ${
                  mode === "couple" ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode === "couple" ? "bg-primary/10" : "bg-muted"}`}>
                  <Users size={22} className={mode === "couple" ? "text-primary" : "text-muted-foreground"} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-bold text-foreground">We Mode</p>
                  <p className="text-xs text-muted-foreground">Shared with your partner</p>
                </div>
                {mode === "couple" && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check size={14} className="text-primary-foreground" />
                  </div>
                )}
              </button>
            </div>
            <button
              onClick={() => mode && setStep("name")}
              disabled={!mode}
              className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              Continue <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {step === "name" && (
          <motion.div key="name" {...anim} className="w-full max-w-sm space-y-6 text-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">What's your name?</h1>
              <p className="text-sm text-muted-foreground">This is how you'll appear in the app</p>
            </div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-muted rounded-xl px-4 py-3.5 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring text-center"
              autoFocus
            />
            <button
              onClick={() => name.trim() ? setStep("priorities") : toast({ title: "Please enter your name", variant: "destructive" })}
              disabled={!name.trim()}
              className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              Continue <ArrowRight size={16} />
            </button>
            <button onClick={() => setStep("mode")} className="text-xs text-muted-foreground">← Back</button>
          </motion.div>
        )}

        {step === "priorities" && (
          <motion.div key="priorities" {...anim} className="w-full max-w-sm space-y-6 text-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">What matters most to you?</h1>
              <p className="text-sm text-muted-foreground">Select all that apply — we'll personalize your experience</p>
            </div>
            <div className="space-y-2.5">
              {PRIORITY_OPTIONS.map(opt => {
                const selected = priorities.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => togglePriority(opt.id)}
                    className={`w-full flex items-center gap-4 rounded-2xl px-5 py-4 border-2 transition-all ${
                      selected ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected ? "bg-primary/10" : "bg-muted"}`}>
                      <opt.icon size={20} className={selected ? "text-primary" : opt.color} />
                    </div>
                    <p className="text-sm font-bold text-foreground flex-1 text-left">{opt.label}</p>
                    {selected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check size={14} className="text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep("morning")}
              className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2"
            >
              {priorities.length > 0 ? "Continue" : "Skip"} <ArrowRight size={16} />
            </button>
            <button onClick={() => setStep("name")} className="text-xs text-muted-foreground">← Back</button>
          </motion.div>
        )}

        {step === "morning" && (
          <motion.div key="morning" {...anim} className="w-full max-w-sm space-y-6 text-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">What's your morning like?</h1>
              <p className="text-sm text-muted-foreground">This helps us time your daily suggestions</p>
            </div>
            <div className="space-y-2.5">
              {MORNING_OPTIONS.map(opt => {
                const selected = morningRoutine === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setMorningRoutine(opt.id)}
                    className={`w-full flex items-center gap-4 rounded-2xl px-5 py-4 border-2 transition-all ${
                      selected ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <div className="text-left flex-1">
                      <p className="text-sm font-bold text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                    {selected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check size={14} className="text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep("goals")}
              className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2"
            >
              {morningRoutine ? "Continue" : "Skip"} <ArrowRight size={16} />
            </button>
            <button onClick={() => setStep("priorities")} className="text-xs text-muted-foreground">← Back</button>
          </motion.div>
        )}

        {step === "goals" && (
          <motion.div key="goals" {...anim} className="w-full max-w-sm space-y-6 text-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">What do you want to achieve?</h1>
              <p className="text-sm text-muted-foreground">Tell us your goals — AI will help you build a plan</p>
            </div>
            {/* Goal chips */}
            {lifeGoals.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {lifeGoals.map(goal => (
                  <span key={goal} className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold">
                    {goal}
                    <button onClick={() => setLifeGoals(prev => prev.filter(g => g !== goal))}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Input */}
            <div className="flex gap-2">
              <input
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && goalInput.trim()) {
                    setLifeGoals(prev => [...prev, goalInput.trim()]);
                    setGoalInput("");
                  }
                }}
                placeholder="Type a goal and press Enter…"
                className="flex-1 bg-muted rounded-xl px-4 py-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
            {/* Suggestions */}
            <div className="flex flex-wrap gap-2 justify-center">
              {GOAL_SUGGESTIONS.filter(s => !lifeGoals.includes(s)).slice(0, 6).map(s => (
                <button
                  key={s}
                  onClick={() => setLifeGoals(prev => [...prev, s])}
                  className="bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {mode === "couple" ? "Continue to Partner Connect" : "Get Started"}
            </button>
            <button onClick={() => setStep("morning")} className="text-xs text-muted-foreground">← Back</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
