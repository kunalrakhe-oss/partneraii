import { useState } from "react";
import { Sparkles, Mail, Lock, ArrowRight, Loader2, User, Users, ShieldCheck, Eye, EyeOff, Phone, UserCircle, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [appMode, setAppMode] = useState<"single" | "couple">(
    () => (localStorage.getItem("lovelist-app-mode") as "single" | "couple") || "single"
  );
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({
          title: "Google sign-in failed",
          description: result.error.message || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Google sign-in failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      toast({ title: "Check your email", description: "We sent a password reset link to your inbox." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
          {mode === "forgot" ? "Reset Password" : mode === "signin" ? "Welcome Back" : "Create Account"}
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {mode === "forgot" ? "Enter your email to receive a reset link" : mode === "signin" ? "Sign in to continue your journey" : "Start your AI-powered life journey"}
        </p>

        {/* Sign in / Sign up toggle */}
        {mode !== "forgot" && (
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
        )}

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
          {mode === "forgot" ? (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full space-y-3"
            >
              {resetSent ? (
                <div className="text-center space-y-3 py-4">
                  <Mail size={40} className="mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">
                    We sent a reset link to <strong className="text-foreground">{email}</strong>. Check your inbox and follow the link to set a new password.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-3">
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
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <>Send Reset Link <ArrowRight size={16} /></>}
                  </button>
                </form>
              )}
              <button
                type="button"
                onClick={() => { setMode("signin"); setResetSent(false); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mx-auto mt-2"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </motion.div>
          ) : (
          <motion.form
            key={mode}
            initial={{ opacity: 0, x: mode === "signin" ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === "signin" ? 20 : -20 }}
            onSubmit={handleSubmit}
            className="w-full space-y-3"
          >
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full h-12 rounded-xl bg-card/70 backdrop-blur-sm border border-border/40 text-sm font-medium text-foreground flex items-center justify-center gap-2 shadow-sm hover:bg-card transition-all disabled:opacity-60"
            >
              {googleLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.54 1 10.22 1 12s.43 3.46 1.18 4.96l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                </svg>
              )}
              Continue with Google
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border/40" />
              <span className="text-[11px] text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border/40" />
            </div>

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
            {mode === "signin" && (
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-xs text-muted-foreground hover:text-primary transition-colors ml-1"
              >
                Forgot password?
              </button>
            )}
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
          )}
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
