import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";

interface OnboardData {
  name: string;
  mode: "single" | "couple";
  priorities: string[];
  lifeGoals: string[];
  dailyHabits: string[];
}

interface ProfileData {
  priorities: string[];
  life_goals: string[];
  daily_goals: string[];
  morning_routine: string;
  profile_summary: string;
}

export default function PostAuthSetup() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"processing" | "done" | "error">("processing");
  const [profileResult, setProfileResult] = useState<ProfileData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    processOnboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const processOnboardData = async () => {
    if (!user) return;

    const raw = localStorage.getItem("lovelist-onboard-data");
    if (!raw) {
      // No cached data — user came directly, mark as done
      localStorage.setItem("lovelist-setup-done", "true");
      navigate("/", { replace: true });
      return;
    }

    let data: OnboardData;
    try {
      data = JSON.parse(raw);
    } catch {
      localStorage.removeItem("lovelist-onboard-data");
      localStorage.setItem("lovelist-setup-done", "true");
      navigate("/", { replace: true });
      return;
    }

    try {
      // 1. Save name & mode to profile
      await supabase
        .from("profiles")
        .update({ display_name: data.name, app_mode: data.mode })
        .eq("user_id", user.id);

      // 2. Generate AI profile
      let profile: ProfileData;
      try {
        const { data: aiData, error } = await supabase.functions.invoke("ai-coach", {
          body: {
            onboarding: true,
            onboardingMode: "structured",
            userName: data.name,
            appMode: data.mode,
            language,
            priorities: data.priorities,
            life_goals: data.lifeGoals,
            daily_goals: data.dailyHabits,
          },
        });

        if (error) throw error;

        if (aiData?.action === "build_profile") {
          profile = aiData.data as ProfileData;
        } else {
          profile = {
            priorities: data.priorities,
            life_goals: data.lifeGoals,
            daily_goals: data.dailyHabits,
            morning_routine: data.dailyHabits.some((h) => h.toLowerCase().includes("workout")) ? "workout" : "planning",
            profile_summary: aiData?.data?.message || `${data.name} is ready to build an extraordinary life.`,
          };
        }
      } catch {
        profile = {
          priorities: data.priorities,
          life_goals: data.lifeGoals,
          daily_goals: data.dailyHabits,
          morning_routine: "planning",
          profile_summary: `${data.name} is ready to build an extraordinary life.`,
        };
      }

      setProfileResult(profile);
      setStatus("done");
    } catch (err: any) {
      console.error("Setup error:", err);
      setStatus("error");
      toast({ title: "Setup error", description: err.message, variant: "destructive" });
      // Still mark done and proceed
      localStorage.removeItem("lovelist-onboard-data");
      localStorage.setItem("lovelist-setup-done", "true");
      navigate("/", { replace: true });
    }
  };

  const handleConfirm = async () => {
    if (!user || !profileResult) return;
    setSaving(true);
    try {
      // Clear cache
      localStorage.removeItem("lovelist-onboard-data");
      localStorage.removeItem("lovelist-app-mode");
      localStorage.setItem("lovelist-setup-done", "true");

      const raw = localStorage.getItem("lovelist-onboard-data");
      // Already cleared above, just navigate
      const mode = (await supabase.from("profiles").select("app_mode").eq("user_id", user.id).single()).data?.app_mode;

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

  const anim = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  if (status === "processing") {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6">
        <motion.div {...anim} className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 size={32} className="text-primary animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Setting up your profile...</h1>
          <p className="text-sm text-muted-foreground">Our AI is creating your personalized plan ✨</p>
        </motion.div>
      </div>
    );
  }

  if (status === "done" && profileResult) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6">
        <motion.div {...anim} className="w-full max-w-md space-y-5">
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
            onClick={handleConfirm}
            disabled={saving}
            className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Looks great, let's go! 🚀
          </button>
        </motion.div>
      </div>
    );
  }

  return null;
}
