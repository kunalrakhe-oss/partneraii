import { useState, useRef, useEffect } from "react";
import { Sparkles, Mail, ArrowRight, Loader2, User, Users, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AuthPage() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [appMode, setAppMode] = useState<"single" | "couple">(
    () => (localStorage.getItem("lovelist-app-mode") as "single" | "couple") || "single"
  );
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStep("otp");
      setCountdown(60);
      toast({ title: "Code sent!", description: `Check ${email} for your 6-digit code.` });
    } catch (err: any) {
      toast({ title: "Oops", description: err.message || "Failed to send code", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: "email",
      });
      if (error) throw error;
      // Auth context will pick up the session automatically
    } catch (err: any) {
      toast({ title: "Invalid code", description: err.message || "Please check and try again", variant: "destructive" });
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all filled
    if (value && index === 5 && newOtp.every(d => d)) {
      setTimeout(() => handleVerifyOtp(), 100);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      const newOtp = pasted.split("");
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      setTimeout(() => {
        // auto-submit
        handleVerifyOtp();
      }, 200);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      toast({ title: "Code resent!", description: `Check ${email} again.` });
    } catch (err: any) {
      toast({ title: "Failed to resend", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full h-12 pl-11 pr-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <div className="flex-1 flex flex-col items-center pt-10 px-6">
        {/* Language switcher */}
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
          <span className="text-xl font-bold text-foreground font-sans">
            Partner<span className="love-gradient-text">AI</span>
          </span>
        </motion.div>

        <h1 className="text-2xl font-bold text-foreground text-center mb-1">
          Welcome to Partner<span className="love-gradient-text">AI</span>
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {step === "email"
            ? "Sign in with a magic code — no password needed"
            : `Enter the 6-digit code sent to ${email}`}
        </p>

        {/* Me / We Mode Toggle */}
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
              onSubmit={handleSendOtp}
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
                    Send Magic Code <ArrowRight size={16} />
                  </>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.div
              key="otp-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full space-y-5"
            >
              {/* OTP Input */}
              <div className="flex justify-center gap-2.5" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-card/50 backdrop-blur-sm border border-border/40 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                  />
                ))}
              </div>

              {/* Verify button */}
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.join("").length !== 6}
                className="w-full h-12 rounded-xl love-gradient text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-soft disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <ShieldCheck size={16} /> Verify & Sign In
                  </>
                )}
              </button>

              {/* Resend / Back */}
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp(["", "", "", "", "", ""]);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Change email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || loading}
                  className="text-primary font-medium disabled:text-muted-foreground transition-colors"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security note */}
        <div className="mt-8 flex items-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck size={14} />
          <span>Passwordless login — secure, fast, no password to remember</span>
        </div>
      </div>

      <div className="px-6 pb-8 pt-4">
        <p className="text-[10px] text-muted-foreground text-center">
          {t("auth.termsText")} <span className="underline">{t("auth.termsOfService")}</span>
          {" & "}
          <span className="underline">{t("auth.privacyPolicy")}</span>
        </p>
      </div>
    </div>
  );
}
