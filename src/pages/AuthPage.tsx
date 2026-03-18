import { useState } from "react";
import { Heart, Mail, Lock, User, ArrowRight, Loader2, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import onboardingHero from "@/assets/onboarding-hero.jpg";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { display_name: displayName, phone },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({ title: t("auth.accountCreated"), description: t("auth.checkEmail") });
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: t("auth.resetLinkSent"), description: t("auth.checkEmailReset") });
      }
    } catch (err: any) {
      toast({ title: t("auth.oops"), description: err.message || t("auth.somethingWrong"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: t("auth.oops"), description: err.message || t("auth.googleFailed"), variant: "destructive" });
      setLoading(false);
    }
  };

  const inputClass = "w-full h-12 pl-11 pr-4 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <div className="flex-1 flex flex-col items-center pt-10 px-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mb-6">
          <Heart size={24} className="text-secondary" fill="currentColor" />
          <span className="text-xl font-bold text-foreground font-sans">LoveList</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="w-28 h-28 rounded-full overflow-hidden mb-5 shadow-elevated border-4 border-card">
          <img src={onboardingHero} alt="Couple" className="w-full h-full object-cover" />
        </motion.div>

        <h1 className="text-2xl font-bold text-foreground text-center mb-1">{t("auth.welcomeTo")}</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {mode === "login" ? t("auth.signInToAccount") : mode === "signup" ? t("auth.createAccount") : t("auth.resetPassword")}
        </p>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 w-full mb-4">
          {(["login", "signup"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors ${mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              {m === "login" ? t("auth.signIn") : t("auth.signUp")}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-3">
          {mode === "signup" && (
            <>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("auth.yourName")} required className={inputClass} />
              </div>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("auth.phoneOptional")} className={inputClass} />
              </div>
            </>
          )}
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.email")} required className={inputClass} />
          </div>
          {mode !== "forgot" && (
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.password")} required minLength={6} className={inputClass} />
            </div>
          )}
          {mode === "login" && (
            <button type="button" onClick={() => setMode("forgot")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {t("auth.forgotPassword")}
            </button>
          )}
          <button type="submit" disabled={loading}
            className="w-full h-12 rounded-xl love-gradient text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-soft disabled:opacity-60">
            {loading ? <Loader2 size={18} className="animate-spin" /> : (
              <>{mode === "login" ? t("auth.signIn") : mode === "signup" ? t("auth.createAccountBtn") : t("auth.sendResetLink")} <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5 w-full">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">{t("auth.orContinueWith")}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google */}
        <button type="button" onClick={handleGoogleSignIn} disabled={loading}
          className="w-full h-12 rounded-xl bg-card border border-border text-sm font-medium text-foreground flex items-center justify-center gap-3 hover:bg-accent transition-colors disabled:opacity-60">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {t("auth.continueWithGoogle")}
        </button>
      </div>

      <div className="px-6 pb-8 pt-4">
        <p className="text-[10px] text-muted-foreground text-center">
          {t("auth.termsText")} <span className="underline">{t("auth.termsOfService")}</span>{" & "}<span className="underline">{t("auth.privacyPolicy")}</span>
        </p>
      </div>
    </div>
  );
}
