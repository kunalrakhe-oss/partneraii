import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGE_OPTIONS } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { User, Users, ArrowRight, Check, Loader2, Sparkles, Globe, Plus, X } from "lucide-react";

type Step = "language" | "mode" | "name" | "priorities" | "life-goals" | "daily-habits" | "generating" | "confirm";

interface ProfileData {
  priorities: string[];
  life_goals: string[];
  daily_goals: string[];
  morning_routine: string;
  profile_summary: string;
}

const PRIORITY_OPTIONS = [
  "Health & Fitness", "Financial Freedom", "Career Growth", "Relationships",
  "Mental Wellness", "Productivity", "Education", "Spirituality",
];

const LIFE_GOAL_OPTIONS = [
  "Become debt free", "Earn first million", "Run a marathon", "Lose weight",
  "Build a business", "Learn a new skill", "Travel the world", "Buy a home", "Get promoted",
];

const DAILY_HABIT_OPTIONS = [
  "Morning workout", "Meditate 10 min", "Track expenses", "Read 30 min",
  "Meal prep", "Journal", "Walk 10k steps", "No screen before bed",
];

function ChipSelector({
  options,
  selected,
  onToggle,
  onAddCustom,
}: {
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
  onAddCustom: (item: string) => void;
}) {
  const [otherText, setOtherText] = useState("");

  const handleAdd = () => {
    const trimmed = otherText.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onAddCustom(trimmed);
      setOtherText("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all border-2 ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/30"
              }`}
            >
              {isSelected && <Check size={14} className="text-primary" />}
              {opt}
            </button>
          );
        })}
        {/* Custom chips */}
        {selected
          .filter((s) => !options.includes(s))
          .map((custom) => (
            <button
              key={custom}
              onClick={() => onToggle(custom)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-medium border-2 border-primary bg-primary/10 text-primary transition-all"
            >
              <Check size={14} />
              {custom}
              <X size={12} className="ml-0.5 opacity-60" />
            </button>
          ))}
      </div>

      {/* Other input */}
      <div className="flex gap-2">
        <input
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add your own..."
          className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={handleAdd}
          disabled={!otherText.trim()}
          className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

export default function PostAuthSetup() {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<"single" | "couple" | null>(() => {
    const saved = localStorage.getItem("lovelist-app-mode");
    return saved === "single" || saved === "couple" ? saved : null;
  });
  const [step, setStep] = useState<Step>(() => {
    const hasLanguage = localStorage.getItem("lovelist-language");
    const hasMode = localStorage.getItem("lovelist-app-mode");
    if (hasLanguage && hasMode) return "name";
    if (hasLanguage) return "mode";
    return "language";
  });
  const rawName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.name ||
    "";
  const looksLikeRealName = rawName.length > 0 && /[a-zA-Z]{2,}/.test(rawName) && !/^[a-z0-9]{8,}$/i.test(rawName);
  const [name, setName] = useState(looksLikeRealName ? rawName : "");
  const [saving, setSaving] = useState(false);

  // Selection state
  const [priorities, setPriorities] = useState<string[]>([]);
  const [lifeGoals, setLifeGoals] = useState<string[]>([]);
  const [dailyHabits, setDailyHabits] = useState<string[]>([]);
  const [profileResult, setProfileResult] = useState<ProfileData | null>(null);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const totalSteps = 6;
  const stepIndex = ["language", "mode", "name", "priorities", "life-goals", "daily-habits"].indexOf(step);

  const generateProfile = async () => {
    setStep("generating");
    try {
      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: {
          onboarding: true,
          onboardingMode: "structured",
          userName: name.trim(),
          appMode: mode || "single",
          language,
          priorities,
          life_goals: lifeGoals,
          daily_goals: dailyHabits,
        },
      });

      if (error) throw error;

      if (data?.action === "build_profile") {
        setProfileResult(data.data as ProfileData);
        setStep("confirm");
      } else {
        // Fallback: use selections directly
        setProfileResult({
          priorities,
          life_goals: lifeGoals,
          daily_goals: dailyHabits,
          morning_routine: dailyHabits.some((h) => h.toLowerCase().includes("workout")) ? "workout" : "planning",
          profile_summary: data?.data?.message || `${name} is on a mission to level up their life.`,
        });
        setStep("confirm");
      }
    } catch (err: any) {
      console.error("Profile generation error:", err);
      // Fallback gracefully
      setProfileResult({
        priorities,
        life_goals: lifeGoals,
        daily_goals: dailyHabits,
        morning_routine: "planning",
        profile_summary: `${name.trim()} is ready to build an extraordinary life.`,
      });
      setStep("confirm");
    }
  };

  const handleConfirmProfile = async () => {
    if (!user || !mode || !profileResult) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ app_mode: mode, display_name: name.trim() })
        .eq("user_id", user.id);
      if (error) throw error;

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
      {/* Progress dots */}
      {stepIndex >= 0 && step !== "generating" && step !== "confirm" && (
        <div className="fixed top-6 left-0 right-0 flex justify-center gap-1.5 z-10">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= stepIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>
      )}

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
              {LANGUAGE_OPTIONS.map((opt) => {
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
              onChange={(e) => setName(e.target.value)}
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
          <motion.div key="priorities" {...anim} className="w-full max-w-md space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-2">What matters most to you?</h1>
              <p className="text-sm text-muted-foreground">Pick your top priorities — select all that apply</p>
            </div>
            <ChipSelector
              options={PRIORITY_OPTIONS}
              selected={priorities}
              onToggle={(item) => toggleItem(priorities, setPriorities, item)}
              onAddCustom={(item) => setPriorities([...priorities, item])}
            />
            <button
              onClick={() => setStep("life-goals")}
              disabled={priorities.length === 0}
              className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {t("common.continue")} <ArrowRight size={16} />
            </button>
            <button onClick={() => setStep("name")} className="text-xs text-muted-foreground mx-auto block">← {t("common.back")}</button>
          </motion.div>
        )}

        {/* LIFE GOALS STEP */}
        {step === "life-goals" && (
          <motion.div key="life-goals" {...anim} className="w-full max-w-md space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-2">What are your life goals?</h1>
              <p className="text-sm text-muted-foreground">Dream big — what do you want to achieve?</p>
            </div>
            <ChipSelector
              options={LIFE_GOAL_OPTIONS}
              selected={lifeGoals}
              onToggle={(item) => toggleItem(lifeGoals, setLifeGoals, item)}
              onAddCustom={(item) => setLifeGoals([...lifeGoals, item])}
            />
            <button
              onClick={() => setStep("daily-habits")}
              disabled={lifeGoals.length === 0}
              className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {t("common.continue")} <ArrowRight size={16} />
            </button>
            <button onClick={() => setStep("priorities")} className="text-xs text-muted-foreground mx-auto block">← {t("common.back")}</button>
          </motion.div>
        )}

        {/* DAILY HABITS STEP */}
        {step === "daily-habits" && (
          <motion.div key="daily-habits" {...anim} className="w-full max-w-md space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-2">Daily habits to build</h1>
              <p className="text-sm text-muted-foreground">Small steps every day lead to big results</p>
            </div>
            <ChipSelector
              options={DAILY_HABIT_OPTIONS}
              selected={dailyHabits}
              onToggle={(item) => toggleItem(dailyHabits, setDailyHabits, item)}
              onAddCustom={(item) => setDailyHabits([...dailyHabits, item])}
            />
            <button
              onClick={generateProfile}
              disabled={dailyHabits.length === 0}
              className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Sparkles size={16} /> Build My Profile
            </button>
            <button onClick={() => setStep("life-goals")} className="text-xs text-muted-foreground mx-auto block">← {t("common.back")}</button>
          </motion.div>
        )}

        {/* GENERATING STEP */}
        {step === "generating" && (
          <motion.div key="generating" {...anim} className="w-full max-w-sm text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Loader2 size={32} className="text-primary animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Building your profile...</h1>
            <p className="text-sm text-muted-foreground">Our AI is creating your personalized plan ✨</p>
          </motion.div>
        )}

        {/* CONFIRM STEP */}
        {step === "confirm" && profileResult && (
          <motion.div key="confirm" {...anim} className="w-full max-w-md space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles size={28} className="text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Your Profile</h1>
              <p className="text-sm text-muted-foreground italic">"{profileResult.profile_summary}"</p>
            </div>

            <div className="bg-card border-2 border-primary/20 rounded-2xl p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Priorities</p>
                <div className="flex flex-wrap gap-1.5">
                  {profileResult.priorities.map((p) => (
                    <span key={p} className="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-semibold">{p}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Life Goals</p>
                <div className="flex flex-wrap gap-1.5">
                  {profileResult.life_goals.map((g) => (
                    <span key={g} className="bg-accent/50 text-accent-foreground px-2.5 py-1 rounded-full text-xs font-medium">{g}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Daily Habits</p>
                <div className="flex flex-wrap gap-1.5">
                  {profileResult.daily_goals.map((d) => (
                    <span key={d} className="bg-muted text-muted-foreground px-2.5 py-1 rounded-full text-xs font-medium">{d}</span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirmProfile}
              disabled={saving}
              className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Looks great, let's go! 🚀
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
