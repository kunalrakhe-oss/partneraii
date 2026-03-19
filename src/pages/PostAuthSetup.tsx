import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { User, Users, ArrowRight, Check, Loader2 } from "lucide-react";

type Step = "mode" | "name";

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
  // Apple relay emails produce gibberish prefixes – detect and clear them
  const looksLikeRealName = rawName.length > 0 && /[a-zA-Z]{2,}/.test(rawName) && !/^[a-z0-9]{8,}$/i.test(rawName);
  const [name, setName] = useState(looksLikeRealName ? rawName : "");
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    if (!user || !mode) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          app_mode: mode,
          display_name: name.trim() || undefined,
        })
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

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6">
      <AnimatePresence mode="wait">
        {step === "mode" && (
          <motion.div
            key="mode"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm space-y-6 text-center"
          >
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
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  mode === "single" ? "bg-primary/10" : "bg-muted"
                }`}>
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
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  mode === "couple" ? "bg-primary/10" : "bg-muted"
                }`}>
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
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm space-y-6 text-center"
          >
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
              onClick={handleFinish}
              disabled={saving || !name.trim()}
              className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {mode === "couple" ? "Continue to Partner Connect" : "Get Started"}
            </button>

            <button onClick={() => setStep("mode")} className="text-xs text-muted-foreground">
              ← Back
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
