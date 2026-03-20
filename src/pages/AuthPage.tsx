import { useEffect, useState } from "react";
import { Sparkles, Mail, ArrowRight, Loader2, User, Users, ShieldCheck, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AuthPage() {
  const [step, setStep] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [appMode, setAppMode] = useState<"single" | "couple">(
    () => (localStorage.getItem("lovelist-app-mode") as "single" | "couple") || "single"
  );
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const handleTryDemo = () => {
    localStorage.setItem("lovelist-onboarding-done", "true");
    navigate("/onboarding");
  };

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const sendMagicLink = async () => {
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      setStep("sent");
      setCountdown(60);
      toast({
        title: "Sign-in link sent!",
        description: `Open the email we sent to ${email.trim()} and tap the link to continue.`,
      });
    } catch (err: any) {
      toast({
        title: "Could not send email",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMagicLink();
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    await sendMagicLink();
  };

  const inputClass =
    "w-full h-12 pl-11 pr-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <div className="flex-1 flex flex-col items-center pt-10 px-6">
        <div className="w-full flex justify-end mb-2">
          <button
            onClick={() => setLanguage(language === "en" ? "hi" : "en")}
            className="px-3 py-1.5 rounded-full bg-card/50 backdrop-blur-sm border border-border/40 text-xs font-medium text-foreground flex items-center gap-1.5 shadow-sm"
          >
            🌐 {language === "en" ? "हिन्दी" : "English"}
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mb-6">
          <Sparkles size={24} className="text-primary" />
          <span className="text-xl font-bold text-foreground font-sans">PAI</span>
        </motion.div>

        <h1 className="text-2xl font-bold text-foreground text-center mb-1">Welcome to PAI</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {step === "email"
            ? "Sign in with a secure email link — no password needed"
            : `We sent a sign-in link to ${email.trim()}`}
        </p>

        {step === "email" && (
          <div className="flex gap-0.5 bg-muted/60 backdrop-blur-sm rounded-full p-0.5 w-fit mx-auto mb-5">
            {([
              { value: "single" as const, label: "Me Mode", icon: User },
              { value: "couple" as const, label: "We Mode", icon: Users },
            ]).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setAppMode(value);
                  localStorage.setItem("lovelist-app-mode", value);
                }}
                className={`flex items-center justify-center gap-1 text-[11px] font-medium px-4 py-1.5 rounded-full transition-colors ${
                  appMode === value
                    ? "bg-card/70 backdrop-blur-sm text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === "email" ? (
            <motion.form
              key="email-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSendMagicLink}
              className="w-full space-y-4"
            >
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoFocus
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full h-12 rounded-xl love-gradient text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-soft disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    Send Sign-In Link <ArrowRight size={16} />
                  </>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.div
              key="sent-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full space-y-5"
            >
              <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-5 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mail size={20} />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">Check your inbox</h2>
                  <p className="text-sm text-muted-foreground">
                    Tap the sign-in link in the email to continue. Once you open it, you’ll be signed in automatically.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || loading}
                className="w-full h-12 rounded-xl love-gradient text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-soft disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : countdown > 0 ? (
                  `Resend link in ${countdown}s`
                ) : (
                  "Resend Sign-In Link"
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Change email address
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex items-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck size={14} />
          <span>Passwordless login — secure, fast, no password to remember</span>
        </div>
      </div>

      <div className="px-6 pb-8 pt-4 space-y-4">
        <button
          type="button"
          onClick={handleTryDemo}
          className="w-full h-11 rounded-xl bg-muted/60 backdrop-blur-sm border border-border/40 text-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-muted transition-colors"
        >
          <Play size={14} />
          Try Demo First
        </button>
        <p className="text-[10px] text-muted-foreground text-center">
          {t("auth.termsText")} <span className="underline">{t("auth.termsOfService")}</span>
          {" & "}
          <span className="underline">{t("auth.privacyPolicy")}</span>
        </p>
      </div>
    </div>
  );
}
