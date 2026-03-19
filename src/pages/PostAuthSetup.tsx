import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGE_OPTIONS } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { User, Users, ArrowRight, Check, Loader2, Dumbbell, Wallet, Heart, Brain, Target, Sparkles, X, Globe } from "lucide-react";

type Step = "language" | "mode" | "name" | "priorities" | "morning" | "goals";

const PRIORITY_OPTIONS = [
  { id: "health", labelKey: "setup.healthFitness", icon: Dumbbell, color: "text-green-500" },
  { id: "finance", labelKey: "setup.financialGoals", icon: Wallet, color: "text-amber-500" },
  { id: "relationship", labelKey: "setup.relationship", icon: Heart, color: "text-pink-500" },
  { id: "productivity", labelKey: "setup.productivity", icon: Target, color: "text-blue-500" },
  { id: "wellness", labelKey: "setup.mentalWellness", icon: Brain, color: "text-purple-500" },
] as const;

const MORNING_OPTIONS = [
  { id: "rushed", labelKey: "setup.rushedBusy", emoji: "⚡", descKey: "setup.rushedDesc" },
  { id: "relaxed", labelKey: "setup.slowRelaxed", emoji: "☕", descKey: "setup.relaxedDesc" },
  { id: "workout", labelKey: "setup.workoutFirst", emoji: "💪", descKey: "setup.workoutDesc" },
  { id: "planning", labelKey: "setup.planOrganize", emoji: "📋", descKey: "setup.planDesc" },
] as const;

const GOAL_SUGGESTION_KEYS = [
  "setup.goalLoseWeight", "setup.goalBuildMuscle", "setup.goalEatHealthier", "setup.goalSaveMoney",
  "setup.goalKneePain", "setup.goalMarathon", "setup.goalSleepBetter", "setup.goalReduceStress",
  "setup.goalRelationship", "setup.goalOrganized",
];

export default function PostAuthSetup() {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("language");
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
        toast({ title: t("setup.enterName"), variant: "destructive" });
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({ app_mode: mode, display_name: trimmedName })
        .eq("user_id", user.id);
      if (error) throw error;

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
        {/* LANGUAGE STEP */}
        {step === "language" && (
          <motion.div key="language" {...anim} className="w-full max-w-sm space-y-6 text-center">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Globe size={28} className="text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{t("setup.chooseLang")}</h1>
              <p className="text-sm text-muted-foreground">{t("setup.chooseLangDesc")}</p>
            </div>
            <div className="space-y-3">
              {LANGUAGE_OPTIONS.map(opt => {
                const selected = language === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setLanguage(opt.value)}
                    className={`w-full flex items-center gap-4 rounded-2xl px-5 py-5 border-2 transition-all ${
                      selected ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <span className="text-2xl">{opt.value === "en" ? "🇬🇧" : "🇮🇳"}</span>
                    <div className="text-left flex-1">
                      <p className="text-sm font-bold text-foreground">{opt.nativeLabel}</p>
                      {opt.value !== "en" && <p className="text-xs text-muted-foreground">{opt.label}</p>}
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
              onClick={() => setStep("mode")}
              className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2"
            >
              {t("common.continue")} <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {/* MODE STEP */}
        {step === "mode" && (
          <motion.div key="mode" {...anim} className="w-full max-w-sm space-y-6 text-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{t("setup.howUse")}</h1>
              <p className="text-sm text-muted-foreground">{t("setup.howUseDesc")}</p>
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
                  <p className="text-sm font-bold text-foreground">{t("setup.meMode")}</p>
                  <p className="text-xs text-muted-foreground">{t("setup.meModeDesc")}</p>
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
                  <p className="text-sm font-bold text-foreground">{t("setup.weMode")}</p>
                  <p className="text-xs text-muted-foreground">{t("setup.weModeDesc")}</p>
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
              {t("common.continue")} <ArrowRight size={16} />
            </button>
            <button onClick={() => setStep("language")} className="text-xs text-muted-foreground">← {t("common.back")}</button>
          </motion.div>
        )}

        {/* NAME STEP */}
        {step === "name" && (
          <motion.div key="name" {...anim} className="w-full max-w-sm space-y-6 text-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{t("setup.whatsName")}</h1>
              <p className="text-sm text-muted-foreground">{t("setup.whatsNameDesc")}</p>
            </div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t("setup.namePlaceholder")}
              className="w-full bg-muted rounded-xl px-4 py-3.5 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring text-center"
              autoFocus
            />
            <button
              onClick={() => name.trim() ? setStep("priorities") : toast({ title: t("setup.enterName"), variant: "destructive" })}
              disabled={!name.trim()}
              className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {t("common.continue")} <ArrowRight size={16} />
            </button>
            <button onClick={() => setStep("mode")} className="text-xs text-muted-foreground">← {t("common.back")}</button>
          </motion.div>
        )}

        {/* PRIORITIES STEP */}
        {step === "priorities" && (
          <motion.div key="priorities" {...anim} className="w-full max-w-sm space-y-6 text-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{t("setup.priorities")}</h1>
              <p className="text-sm text-muted-foreground">{t("setup.prioritiesDesc")}</p>
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
                    <p className="text-sm font-bold text-foreground flex-1 text-left">{t(opt.labelKey)}</p>
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
              {priorities.length > 0 ? t("common.continue") : t("common.skip")} <ArrowRight size={16} />
            </button>
            <button onClick={() => setStep("name")} className="text-xs text-muted-foreground">← {t("common.back")}</button>
          </motion.div>
        )}

        {/* MORNING STEP */}
        {step === "morning" && (
          <motion.div key="morning" {...anim} className="w-full max-w-sm space-y-6 text-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{t("setup.morning")}</h1>
              <p className="text-sm text-muted-foreground">{t("setup.morningDesc")}</p>
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
                      <p className="text-sm font-bold text-foreground">{t(opt.labelKey)}</p>
                      <p className="text-xs text-muted-foreground">{t(opt.descKey)}</p>
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
              {morningRoutine ? t("common.continue") : t("common.skip")} <ArrowRight size={16} />
            </button>
            <button onClick={() => setStep("priorities")} className="text-xs text-muted-foreground">← {t("common.back")}</button>
          </motion.div>
        )}

        {/* GOALS STEP */}
        {step === "goals" && (
          <motion.div key="goals" {...anim} className="w-full max-w-sm space-y-6 text-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{t("setup.goals")}</h1>
              <p className="text-sm text-muted-foreground">{t("setup.goalsDesc")}</p>
            </div>
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
                placeholder={t("setup.goalPlaceholder")}
                className="flex-1 bg-muted rounded-xl px-4 py-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {GOAL_SUGGESTION_KEYS.filter(k => !lifeGoals.includes(t(k))).slice(0, 6).map(k => (
                <button
                  key={k}
                  onClick={() => setLifeGoals(prev => [...prev, t(k)])}
                  className="bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground transition-colors"
                >
                  + {t(k)}
                </button>
              ))}
            </div>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {mode === "couple" ? t("setup.continueToPartner") : t("setup.getStarted")}
            </button>
            <button onClick={() => setStep("morning")} className="text-xs text-muted-foreground">← {t("common.back")}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
