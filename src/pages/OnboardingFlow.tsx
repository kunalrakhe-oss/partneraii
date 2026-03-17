import { useState, useEffect } from "react";
import { Heart, ArrowRight, ChevronRight, ChevronLeft, Sparkles, Users, MessageCircle, Brain, Camera, ClipboardList, Smile, Send, Copy, Keyboard, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import onboardingHero from "@/assets/onboarding-hero.jpg";

type Step = "entry" | "slides" | "mode" | "demo" | "setup-names" | "setup-connect" | "setup-start" | "done";

const slides = [
  {
    emoji: "❤️",
    title: "Stay connected daily",
    description: "See how your partner feels. Never miss the small things.",
    color: "from-secondary/20 to-secondary/5",
  },
  {
    emoji: "🧠",
    title: "Smart AI for your relationship",
    description: "Auto-organize life, suggest moments, reduce stress.",
    color: "from-primary/20 to-primary/5",
  },
  {
    emoji: "💑",
    title: "Build something together",
    description: "Memories, tasks, and love — all in one place.",
    color: "from-accent/30 to-accent/10",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.35, ease: [0.2, 0, 0, 1] as [number, number, number, number] },
};

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { exitDemo } = useDemo();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(() => {
    // Resume at setup-names if user just authenticated via "real" path
    if (user && localStorage.getItem("lovelist-demo-dismissed") === "true" && localStorage.getItem("lovelist-onboarding-done") !== "true") {
      return "setup-names";
    }
    return "entry";
  });
  const [slideIndex, setSlideIndex] = useState(0);
  const [yourName, setYourName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [enterCode, setEnterCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);

  // Check if onboarding already completed — redirect once on mount only
  useEffect(() => {
    const done = localStorage.getItem("lovelist-onboarding-done");
    if (done === "true") {
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem("lovelist-onboarding-done", "true");
    // Show AI suggestion after a delay
    setShowSuggestion(true);
    setTimeout(() => {
      navigate("/", { replace: true });
    }, 3000);
  };

  const enterDemoMode = () => {
    // Don't exit demo — it's already active by default
    localStorage.setItem("lovelist-onboarding-done", "true");
    navigate("/", { replace: true });
  };

  const handleSlideNext = () => {
    if (slideIndex < slides.length - 1) {
      setSlideIndex(slideIndex + 1);
    } else {
      setStep("mode");
    }
  };

  const handleSaveNames = async () => {
    if (!yourName.trim()) return;
    if (user) {
      await supabase
        .from("profiles")
        .update({ display_name: yourName.trim() })
        .eq("user_id", user.id);
    }
    // Generate invite code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    if (user) {
      await supabase.from("partner_invites").insert({ inviter_id: user.id, invite_code: code });
    }
    setInviteCode(code);
    setStep("setup-connect");
  };

  const handleWhatsAppInvite = () => {
    const text = encodeURIComponent(
      `Join me on LoveList! 💕 Use my code: ${inviteCode}\n\nDownload: ${window.location.origin}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAcceptCode = async () => {
    if (!enterCode.trim() || !user) return;
    const { data, error } = await supabase.rpc("accept_partner_invite", { code: enterCode.trim().toUpperCase() });
    if (error) {
      toast({ title: "Invalid code", description: "Please check and try again.", variant: "destructive" });
      return;
    }
    toast({ title: "Connected! 🎉", description: "You're now paired with your partner." });
    setStep("setup-start");
  };

  const seedLightData = async () => {
    if (!user) return;
    let pair: string | null = null;
    try {
      const { data } = await supabase.rpc("get_partner_pair", { uid: user.id });
      pair = data;
    } catch {}
    if (!pair) pair = user.id;

    // Seed 1 sample task
    await supabase.from("chores").insert({
      title: "Plan something special ❤️",
      user_id: user.id,
      partner_pair: pair,
      assigned_to: "me",
    });

    // Seed 1 placeholder memory
    await supabase.from("memories").insert({
      title: "Our Story Begins 💕",
      type: "milestone",
      user_id: user.id,
      partner_pair: pair,
      description: "The start of something beautiful",
    });
  };

  const handleStartAction = async (action: string) => {
    await seedLightData();
    completeOnboarding();
    if (action === "memory") navigate("/memories", { replace: true });
    else if (action === "task") navigate("/chores", { replace: true });
    else if (action === "mood") navigate("/mood", { replace: true });
    else navigate("/", { replace: true });
  };

  // ─── RENDER ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto relative overflow-hidden">
      <AnimatePresence mode="wait">
        {/* ─── STEP 0: Entry ─── */}
        {step === "entry" && (
          <motion.div key="entry" {...fadeUp} className="flex-1 flex flex-col items-center justify-between px-6 py-12">
            <div className="flex-1 flex flex-col items-center justify-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 shadow-elevated"
              >
                <Heart size={36} className="text-primary-foreground" fill="currentColor" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold text-foreground mb-2"
              >
                LoveList
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-muted-foreground text-center max-w-[240px] leading-relaxed"
              >
                Build your relationship, not just tasks
              </motion.p>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="w-48 h-48 rounded-full overflow-hidden mt-10 shadow-elevated border-4 border-card"
              >
                <img src={onboardingHero} alt="Couple" className="w-full h-full object-cover" />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full space-y-3 mt-8"
            >
              <button
                onClick={() => setStep("slides")}
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 shadow-elevated"
              >
                <Heart size={18} fill="currentColor" />
                Start Together
              </button>
              <button
                onClick={enterDemoMode}
                className="w-full h-12 rounded-2xl bg-card border border-border text-foreground font-medium text-sm flex items-center justify-center gap-2"
              >
                <Sparkles size={16} className="text-primary" />
                Try Demo
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ─── STEP 1: Onboarding Slides ─── */}
        {step === "slides" && (
          <motion.div key="slides" {...fadeUp} className="flex-1 flex flex-col px-6 py-12">
            <div className="flex-1 flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slideIndex}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${slides[slideIndex].color} flex items-center justify-center mb-8`}>
                    <span className="text-5xl">{slides[slideIndex].emoji}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">
                    {slides[slideIndex].title}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed">
                    {slides[slideIndex].description}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Dots */}
              <div className="flex gap-2 mt-10">
                {slides.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === slideIndex ? "w-6 bg-primary" : "w-2 bg-border"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              {slideIndex > 0 && (
                <button
                  onClick={() => setSlideIndex(slideIndex - 1)}
                  className="h-14 w-14 rounded-2xl bg-card border border-border flex items-center justify-center"
                >
                  <ChevronLeft size={20} className="text-foreground" />
                </button>
              )}
              <button
                onClick={handleSlideNext}
                className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 shadow-elevated"
              >
                {slideIndex < slides.length - 1 ? "Next" : "Continue"}
                <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── STEP 2: Mode Selection ─── */}
        {step === "mode" && (
          <motion.div key="mode" {...fadeUp} className="flex-1 flex flex-col items-center justify-center px-6">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6"
            >
              <Users size={28} className="text-primary-foreground" />
            </motion.div>

            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">How do you want to start?</h2>
            <p className="text-sm text-muted-foreground text-center mb-10">Choose what feels right</p>

            <div className="w-full space-y-3">
              <button
                onClick={() => {
                  // Exit demo mode since user chose the real path
                  exitDemo();
                  if (user) {
                    setStep("setup-names");
                  } else {
                    // Need to auth first — store intent
                    localStorage.setItem("lovelist-onboard-intent", "real");
                    navigate("/auth", { replace: true });
                  }
                }}
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 shadow-elevated"
              >
                ❤️ With My Partner
              </button>
              <button
                onClick={enterDemoMode}
                className="w-full h-12 rounded-2xl bg-card border border-border text-foreground font-medium text-sm flex items-center justify-center gap-2"
              >
                ✨ Explore Demo First
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── STEP 3B-1: Names ─── */}
        {step === "setup-names" && (
          <motion.div key="names" {...fadeUp} className="flex-1 flex flex-col px-6 py-12">
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-foreground mb-1">Tell us about you</h2>
              <p className="text-sm text-muted-foreground mb-8">Just the basics to get started</p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Your name</label>
                  <input
                    value={yourName}
                    onChange={(e) => setYourName(e.target.value)}
                    placeholder="e.g. Kunal"
                    className="w-full h-12 px-4 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Partner's name (optional)</label>
                  <input
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="e.g. Neelam"
                    className="w-full h-12 px-4 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveNames}
              disabled={!yourName.trim()}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 shadow-elevated disabled:opacity-40"
            >
              Continue
              <ArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {/* ─── STEP 3B-2: Connect Partner ─── */}
        {step === "setup-connect" && (
          <motion.div key="connect" {...fadeUp} className="flex-1 flex flex-col px-6 py-12">
            <div className="flex-1 flex flex-col justify-center items-center text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mb-4">
                <Heart size={28} className="text-secondary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Connect with your partner ❤️</h2>
              <p className="text-sm text-muted-foreground mb-8">Choose how to invite them</p>

              <div className="w-full space-y-3">
                {/* WhatsApp - Primary */}
                <button
                  onClick={handleWhatsAppInvite}
                  className="w-full h-14 rounded-2xl bg-[hsl(142,70%,45%)] text-white font-semibold text-base flex items-center justify-center gap-2.5 shadow-elevated"
                >
                  <Send size={18} />
                  Send Invite via WhatsApp
                </button>

                {/* Copy Code */}
                <button
                  onClick={handleCopyCode}
                  className="w-full h-12 rounded-2xl bg-card border border-border text-foreground font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Copy size={16} />
                  {copied ? "Copied!" : `Copy Code: ${inviteCode}`}
                </button>

                {/* Enter Code */}
                <button
                  onClick={() => setShowCodeInput(!showCodeInput)}
                  className="w-full h-12 rounded-2xl bg-card border border-border text-foreground font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Keyboard size={16} />
                  Enter Partner's Code
                </button>

                <AnimatePresence>
                  {showCodeInput && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-2 pt-2">
                        <input
                          value={enterCode}
                          onChange={(e) => setEnterCode(e.target.value.toUpperCase())}
                          placeholder="XXXXX"
                          maxLength={5}
                          className="flex-1 h-12 px-4 rounded-xl bg-card border border-border text-center text-lg font-bold tracking-[0.3em] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <button
                          onClick={handleAcceptCode}
                          disabled={enterCode.length < 5}
                          className="h-12 px-5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40"
                        >
                          Join
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <button
              onClick={() => setStep("setup-start")}
              className="text-sm text-muted-foreground text-center py-3"
            >
              Skip for now →
            </button>
          </motion.div>
        )}

        {/* ─── STEP 3B-3: Start Your Journey ─── */}
        {step === "setup-start" && (
          <motion.div key="start" {...fadeUp} className="flex-1 flex flex-col px-6 py-12">
            <div className="flex-1 flex flex-col justify-center items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <Sparkles size={28} className="text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Start your journey ❤️</h2>
              <p className="text-sm text-muted-foreground mb-8">Pick your first action</p>

              <div className="w-full space-y-3">
                <button
                  onClick={() => handleStartAction("memory")}
                  className="w-full h-14 rounded-2xl bg-card border border-border text-foreground font-medium text-base flex items-center gap-3 px-5"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center">
                    <Camera size={18} className="text-secondary" />
                  </div>
                  Add First Memory
                </button>
                <button
                  onClick={() => handleStartAction("task")}
                  className="w-full h-14 rounded-2xl bg-card border border-border text-foreground font-medium text-base flex items-center gap-3 px-5"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <ClipboardList size={18} className="text-primary" />
                  </div>
                  Add First Task
                </button>
                <button
                  onClick={() => handleStartAction("mood")}
                  className="w-full h-14 rounded-2xl bg-card border border-border text-foreground font-medium text-base flex items-center gap-3 px-5"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/30 flex items-center justify-center">
                    <Smile size={18} className="text-accent-foreground" />
                  </div>
                  Set Today's Mood
                </button>
              </div>
            </div>

            <button
              onClick={() => handleStartAction("home")}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 shadow-elevated"
            >
              Go to Home
              <ArrowRight size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── AI Suggestion Popup ─── */}
      <AnimatePresence>
        {showSuggestion && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto z-50"
          >
            <div className="bg-card border border-border rounded-2xl p-4 shadow-elevated flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Sparkles size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary mb-0.5">✨ LoveBot Suggestion</p>
                <p className="text-sm text-foreground">Plan a small surprise today ❤️</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
