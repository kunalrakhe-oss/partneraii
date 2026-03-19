import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight, ArrowLeft, ChevronRight, ChevronLeft, Sparkles, Users, Brain, User, Check, Plus, X, Mail, Loader2, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Step = "language" | "entry" | "slides" | "mode" | "name" | "priorities" | "life-goals" | "daily-habits" | "save-progress";

const slides = [
  {
    emoji: "✨",
    title: "Stay on top of your day",
    description: "Track your mood, tasks, and daily goals effortlessly.",
    color: "from-secondary/20 to-secondary/5",
  },
  {
    emoji: "🧠",
    title: "Smart AI for your life",
    description: "Auto-organize life, suggest moments, reduce stress.",
    color: "from-primary/20 to-primary/5",
  },
  {
    emoji: "🚀",
    title: "Build your best life",
    description: "Memories, tasks, fitness, and wellness — all in one place.",
    color: "from-accent/30 to-accent/10",
  },
];

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

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.35, ease: [0.2, 0, 0, 1] as [number, number, number, number] },
};

const STEP_ORDER: Step[] = ["language", "entry", "slides", "mode", "name", "priorities", "life-goals", "daily-habits", "save-progress"];

function getPrevStep(current: Step): Step | null {
  const idx = STEP_ORDER.indexOf(current);
  if (idx <= 0) return null;
  return STEP_ORDER[idx - 1];
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-card/80 backdrop-blur border border-border flex items-center justify-center"
    >
      <ArrowLeft size={18} className="text-foreground" />
    </button>
  );
}

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { exitDemo } = useDemo();
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();

  const [step, setStep] = useState<Step>(() => {
    const hasLanguage = localStorage.getItem("lovelist-language");
    return hasLanguage ? "entry" : "language";
  });
  const [slideIndex, setSlideIndex] = useState(0);
  const [appMode, setAppMode] = useState<"single" | "couple">("couple");
  const [yourName, setYourName] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [lifeGoals, setLifeGoals] = useState<string[]>([]);
  const [dailyHabits, setDailyHabits] = useState<string[]>([]);

  // Auth state for save-progress step
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authSent, setAuthSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // If user becomes authenticated (magic link callback), redirect to setup
  useEffect(() => {
    if (user) {
      navigate("/setup", { replace: true });
    }
  }, [user, navigate]);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const goBack = () => {
    if (step === "slides" && slideIndex > 0) {
      setSlideIndex(slideIndex - 1);
      return;
    }
    const prev = getPrevStep(step);
    if (prev) setStep(prev);
  };

  const handleSlideNext = () => {
    if (slideIndex < slides.length - 1) {
      setSlideIndex(slideIndex + 1);
    } else {
      setStep("mode");
    }
  };

  const handleModeSelect = (mode: "single" | "couple") => {
    setAppMode(mode);
    exitDemo();
    localStorage.setItem("lovelist-app-mode", mode);
    setStep("name");
  };

  const cacheOnboardData = () => {
    localStorage.setItem("lovelist-onboard-data", JSON.stringify({
      name: yourName.trim(),
      mode: appMode,
      priorities,
      lifeGoals,
      dailyHabits,
    }));
    localStorage.setItem("lovelist-onboard-intent", "real");
  };

  const handleSendMagicLink = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) return;
    // Cache all data before sending link
    cacheOnboardData();
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      setAuthSent(true);
      setCountdown(60);
      toast({ title: "Sign-in link sent!", description: `Check ${email.trim()} for the link.` });
    } catch (err: any) {
      toast({ title: "Could not send email", description: err.message, variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  };

  const enterDemoMode = () => {
    cacheOnboardData();
    localStorage.setItem("lovelist-onboarding-done", "true");
    navigate("/", { replace: true });
  };

  // Progress indicator for selection steps
  const selectionSteps: Step[] = ["name", "priorities", "life-goals", "daily-habits", "save-progress"];
  const selectionIndex = selectionSteps.indexOf(step);
  const showProgress = selectionIndex >= 0;

  return (
    <div className="h-[100dvh] bg-background flex flex-col max-w-lg mx-auto relative overflow-hidden">
      {/* Progress dots for selection steps */}
      {showProgress && (
        <div className="fixed top-6 left-0 right-0 flex justify-center gap-1.5 z-10">
          {selectionSteps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= selectionIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ─── LANGUAGE ─── */}
        {step === "language" && (
          <motion.div key="language" {...fadeUp} className="flex-1 flex flex-col items-center justify-center px-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-8 shadow-elevated"
            >
              <span className="text-4xl">🌐</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-2xl font-bold text-foreground mb-2 text-center">
              Choose your language
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-sm text-muted-foreground text-center mb-10">
              अपनी भाषा चुनें
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="w-full space-y-3 max-w-xs">
              <button
                onClick={() => { setLanguage("en"); setStep("entry"); }}
                className={`w-full h-14 rounded-2xl font-semibold text-base flex items-center justify-center gap-3 transition-all ${
                  language === "en" ? "bg-primary text-primary-foreground shadow-elevated" : "bg-card border border-border text-foreground hover:border-primary/40"
                }`}
              >
                🇺🇸 English
              </button>
              <button
                onClick={() => { setLanguage("hi"); setStep("entry"); }}
                className={`w-full h-14 rounded-2xl font-semibold text-base flex items-center justify-center gap-3 transition-all ${
                  language === "hi" ? "bg-primary text-primary-foreground shadow-elevated" : "bg-card border border-border text-foreground hover:border-primary/40"
                }`}
              >
                🇮🇳 हिन्दी
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ─── ENTRY ─── */}
        {step === "entry" && (
          <motion.div key="entry" {...fadeUp} className="flex-1 flex flex-col items-center justify-between px-6 pt-safe pb-6">
            <div className="w-full flex justify-end pt-2">
              <button onClick={() => setStep("language")} className="px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium text-foreground flex items-center gap-1.5 shadow-sm">
                🌐 {language === "en" ? "English" : "हिन्दी"}
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 200 }} className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-6 shadow-elevated ring-2 ring-primary/20">
                <Sparkles size={32} className="text-primary" />
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-3xl font-bold text-foreground mb-2">
                {t("onboarding.loveList")}
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-sm text-muted-foreground text-center max-w-[240px] leading-relaxed">
                Your life, organized.
              </motion.p>
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="w-full space-y-3 mt-8">
              <button onClick={() => setStep("slides")} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 shadow-elevated">
                <Sparkles size={18} /> Get Started
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ─── SLIDES ─── */}
        {step === "slides" && (
          <motion.div key="slides" {...fadeUp} className="flex-1 flex flex-col px-6 py-12 relative">
            <BackButton onClick={goBack} />
            <div className="flex-1 flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div key={slideIndex} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }} className="flex flex-col items-center text-center">
                  <div className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${slides[slideIndex].color} flex items-center justify-center mb-8`}>
                    <span className="text-5xl">{slides[slideIndex].emoji}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">{slides[slideIndex].title}</h2>
                  <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed">{slides[slideIndex].description}</p>
                </motion.div>
              </AnimatePresence>
              <div className="flex gap-2 mt-10">
                {slides.map((_, i) => (
                  <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === slideIndex ? "w-6 bg-primary" : "w-2 bg-border"}`} />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              {slideIndex > 0 && (
                <button onClick={() => setSlideIndex(slideIndex - 1)} className="h-14 w-14 rounded-2xl bg-card border border-border flex items-center justify-center">
                  <ChevronLeft size={20} className="text-foreground" />
                </button>
              )}
              <button onClick={handleSlideNext} className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 shadow-elevated">
                {slideIndex < slides.length - 1 ? "Next" : "Continue"} <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── MODE ─── */}
        {step === "mode" && (
          <motion.div key="mode" {...fadeUp} className="flex-1 flex flex-col items-center justify-center px-6 relative">
            <BackButton onClick={goBack} />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6">
              <Sparkles size={28} className="text-primary-foreground" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">How do you want to use PAI?</h2>
            <p className="text-sm text-muted-foreground text-center mb-10">You can always change this later</p>
            <div className="w-full space-y-3">
              <button onClick={() => handleModeSelect("couple")} className="w-full h-16 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center gap-4 px-5 shadow-elevated">
                <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0"><Users size={20} /></div>
                <div className="text-left">
                  <p className="text-base font-bold">With My Partner</p>
                  <p className="text-xs opacity-80">Share lists, chores & calendar</p>
                </div>
              </button>
              <button onClick={() => handleModeSelect("single")} className="w-full h-16 rounded-2xl bg-card border border-border text-foreground font-semibold text-base flex items-center gap-4 px-5 shadow-soft">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0"><User size={20} className="text-primary" /></div>
                <div className="text-left">
                  <p className="text-base font-bold">Just Me</p>
                  <p className="text-xs text-muted-foreground">Personal productivity & wellness</p>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── NAME ─── */}
        {step === "name" && (
          <motion.div key="name" {...fadeUp} className="flex-1 flex flex-col items-center justify-center px-6 relative">
            <BackButton onClick={goBack} />
            <div className="w-full max-w-sm space-y-6 text-center">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">{t("setup.whatsName")}</h1>
                <p className="text-sm text-muted-foreground">{t("setup.whatsNameDesc")}</p>
              </div>
              <input
                value={yourName}
                onChange={(e) => setYourName(e.target.value)}
                placeholder={t("setup.namePlaceholder")}
                className="w-full bg-muted rounded-xl px-4 py-3.5 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring text-center"
                autoFocus
              />
              <button
                onClick={() => yourName.trim() ? setStep("priorities") : toast({ title: "Please enter your name", variant: "destructive" })}
                disabled={!yourName.trim()}
                className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {t("common.continue")} <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── PRIORITIES ─── */}
        {step === "priorities" && (
          <motion.div key="priorities" {...fadeUp} className="flex-1 flex flex-col items-center justify-center px-6 relative">
            <BackButton onClick={goBack} />
            <div className="w-full max-w-md space-y-6">
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
            </div>
          </motion.div>
        )}

        {/* ─── LIFE GOALS ─── */}
        {step === "life-goals" && (
          <motion.div key="life-goals" {...fadeUp} className="flex-1 flex flex-col items-center justify-center px-6 relative">
            <BackButton onClick={goBack} />
            <div className="w-full max-w-md space-y-6">
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
            </div>
          </motion.div>
        )}

        {/* ─── DAILY HABITS ─── */}
        {step === "daily-habits" && (
          <motion.div key="daily-habits" {...fadeUp} className="flex-1 flex flex-col items-center justify-center px-6 relative">
            <BackButton onClick={goBack} />
            <div className="w-full max-w-md space-y-6">
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
                onClick={() => { cacheOnboardData(); setStep("save-progress"); }}
                disabled={dailyHabits.length === 0}
                className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {t("common.continue")} <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── SAVE PROGRESS (LOGIN) ─── */}
        {step === "save-progress" && (
          <motion.div key="save-progress" {...fadeUp} className="flex-1 flex flex-col items-center justify-center px-6 relative">
            <BackButton onClick={goBack} />
            <div className="w-full max-w-sm space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={32} className="text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Save your progress</h1>
                <p className="text-sm text-muted-foreground">Sign in with a quick email link to keep your personalized plan</p>
              </div>

              {!authSent ? (
                <form onSubmit={handleSendMagicLink} className="space-y-4">
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      autoFocus
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading || !email.trim()}
                    className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-soft disabled:opacity-60 transition-all"
                  >
                    {authLoading ? <Loader2 size={18} className="animate-spin" /> : <>Send Sign-In Link <ArrowRight size={16} /></>}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-5 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Mail size={20} />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">Check your inbox</h2>
                    <p className="text-sm text-muted-foreground">Tap the sign-in link in the email to continue.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { if (countdown <= 0) handleSendMagicLink(); }}
                    disabled={countdown > 0 || authLoading}
                    className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {authLoading ? <Loader2 size={18} className="animate-spin" /> : countdown > 0 ? `Resend in ${countdown}s` : "Resend Sign-In Link"}
                  </button>
                  <button type="button" onClick={() => setAuthSent(false)} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                    ← Change email address
                  </button>
                </div>
              )}

              <button onClick={enterDemoMode} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center">
                Skip for now — try demo mode
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
