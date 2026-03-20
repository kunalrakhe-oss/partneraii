import { useState } from "react";
import { Sparkles, Mail, Lock, ArrowRight, Loader2, User, Users, ShieldCheck, Eye, EyeOff, Phone, UserCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appMode, setAppMode] = useState<"single" | "couple">(
    () => (localStorage.getItem("lovelist-app-mode") as "single" | "couple") || "single"
  );
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (mode === "signup" && !fullName.trim()) return;

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName.trim(),
              display_name: fullName.trim(),
              phone: phone.trim() || undefined,
            },
          },
        });
        if (error) throw error;

        // Update profile with name & phone after sign-up
        if (data?.user) {
          await supabase.from("profiles").update({
            display_name: fullName.trim(),
            phone: phone.trim() || null,
            app_mode: appMode,
          }).eq("user_id", data.user.id);

          localStorage.setItem("lovelist-setup-done", "true");
          localStorage.setItem("lovelist-app-mode", appMode);
        }

        toast({
          title: "Account created!",
          description: "Check your email to verify your account, then sign in.",
        });
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      toast({
        title: mode === "signup" ? "Sign up failed" : "Sign in failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

        <h1 className="text-2xl font-bold text-foreground text-center mb-1">
          {mode === "signin" ? "Welcome Back" : "Create Account"}
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {mode === "signin" ? "Sign in to continue your journey" : "Start your AI-powered life journey"}
        </p>

        {/* Sign in / Sign up toggle */}
        <div className="flex gap-0.5 bg-muted/60 backdrop-blur-sm rounded-full p-0.5 w-full mb-5">
          {([
            { value: "signin" as const, label: "Sign In" },
            { value: "signup" as const, label: "Sign Up" },
          ]).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`flex-1 text-sm font-medium py-2 rounded-full transition-colors ${
                mode === value
                  ? "bg-card/70 backdrop-blur-sm text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Mode toggle - only on sign up */}
        {mode === "signup" && (
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
          <motion.form
            key={mode}
            initial={{ opacity: 0, x: mode === "signin" ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === "signin" ? 20 : -20 }}
            onSubmit={handleSubmit}
            className="w-full space-y-3"
          >
            {mode === "signup" && (
              <>
                <div className="relative">
                  <UserCircle size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required
                    autoFocus
                    className={inputClass}
                  />
                </div>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number (optional)"
                    className={inputClass}
                  />
                </div>
              </>
            )}
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoFocus={mode === "signin"}
                className={inputClass}
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Create a password" : "Enter your password"}
                required
                minLength={6}
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim() || (mode === "signup" && !fullName.trim())}
              className="w-full h-12 rounded-xl love-gradient text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-soft disabled:opacity-60 transition-all"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign In" : "Create Account"} <ArrowRight size={16} />
                </>
              )}
            </button>
          </motion.form>
        </AnimatePresence>

        <div className="mt-6 flex items-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck size={14} />
          <span>Your data is encrypted and secure</span>
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
