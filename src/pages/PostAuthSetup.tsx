import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGE_OPTIONS } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { User, Users, ArrowRight, Check, Loader2, Sparkles, Globe, Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";

type Step = "language" | "mode" | "name" | "ai-interview";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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

  // AI Interview state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [profileResult, setProfileResult] = useState<ProfileData | null>(null);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  // Start the AI interview when entering the step
  useEffect(() => {
    if (step === "ai-interview" && !interviewStarted) {
      setInterviewStarted(true);
      sendToAI("Hi, I'm ready to get started!");
    }
  }, [step, interviewStarted]);

  const sendToAI = async (messageText: string) => {
    if (chatLoading) return;
    setChatLoading(true);

    const userMsg: ChatMessage = { role: "user", content: messageText };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);

    try {
      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: {
          message: messageText,
          history: updatedMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          onboarding: true,
          userName: name.trim(),
          appMode: mode || "single",
          language,
        },
      });

      if (error) throw error;

      if (data?.action === "build_profile") {
        const profile = data.data as ProfileData;
        setProfileResult(profile);
        setChatMessages(prev => [
          ...prev,
          { role: "assistant", content: `✨ I've got a great picture of who you are! Here's your personalized profile:` },
        ]);
      } else if (data?.action === "chat_response") {
        const msg = data.data?.message || "Tell me more!";
        setChatMessages(prev => [...prev, { role: "assistant", content: msg }]);
      } else {
        setChatMessages(prev => [...prev, { role: "assistant", content: data?.data?.message || "What else would you like to share?" }]);
      }
    } catch (err: any) {
      console.error("AI interview error:", err);
      setChatMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, I had a moment. Could you tell me that again? 😊" },
      ]);
    } finally {
      setChatLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleChatSend = () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput("");
    sendToAI(text);
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
              {LANGUAGE_OPTIONS.map(opt => {
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
              onChange={e => setName(e.target.value)}
              placeholder={t("setup.namePlaceholder")}
              className="w-full bg-muted rounded-xl px-4 py-3.5 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring text-center"
              autoFocus
            />
            <button
              onClick={() => name.trim() ? setStep("ai-interview") : toast({ title: t("setup.enterName"), variant: "destructive" })}
              disabled={!name.trim()}
              className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {t("common.continue")} <ArrowRight size={16} />
            </button>
            <button onClick={() => setStep("mode")} className="text-xs text-muted-foreground">← {t("common.back")}</button>
          </motion.div>
        )}

        {/* AI INTERVIEW STEP */}
        {step === "ai-interview" && (
          <motion.div key="ai-interview" {...anim} className="w-full max-w-md flex flex-col h-[100dvh] py-4">
            {/* Header */}
            <div className="text-center mb-3 flex-shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Sparkles size={24} className="text-primary" />
              </div>
              <h1 className="text-lg font-bold text-foreground">Your AI Life Coach</h1>
              <p className="text-xs text-muted-foreground">Let's build your personalized profile</p>
            </div>

            {/* Chat messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 px-1 mb-3">
              {chatMessages.filter((m, i) => !(i === 0 && m.role === "user")).map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>p:last-child]:mb-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Profile result card */}
              {profileResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-card border-2 border-primary/20 rounded-2xl p-5 space-y-4"
                >
                  <p className="text-sm font-medium text-muted-foreground italic">"{profileResult.profile_summary}"</p>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Priorities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {profileResult.priorities.map(p => (
                          <span key={p} className="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-semibold">{p}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Life Goals</p>
                      <div className="flex flex-wrap gap-1.5">
                        {profileResult.life_goals.map(g => (
                          <span key={g} className="bg-accent/50 text-accent-foreground px-2.5 py-1 rounded-full text-xs font-medium">{g}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Daily Habits</p>
                      <div className="flex flex-wrap gap-1.5">
                        {profileResult.daily_goals.map(d => (
                          <span key={d} className="bg-muted text-muted-foreground px-2.5 py-1 rounded-full text-xs font-medium">{d}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmProfile}
                    disabled={saving}
                    className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Looks great, let's go! 🚀
                  </button>
                </motion.div>
              )}
            </div>

            {/* Input area */}
            {!profileResult && (
              <div className="flex-shrink-0 flex gap-2 px-1">
                <input
                  ref={inputRef}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleChatSend()}
                  placeholder="Type your answer..."
                  disabled={chatLoading}
                  className="flex-1 bg-muted rounded-xl px-4 py-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  autoFocus
                />
                <button
                  onClick={handleChatSend}
                  disabled={!chatInput.trim() || chatLoading}
                  className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
                >
                  <Send size={18} />
                </button>
              </div>
            )}

            {/* Back button */}
            {!profileResult && chatMessages.length <= 1 && (
              <button
                onClick={() => { setStep("name"); setInterviewStarted(false); setChatMessages([]); }}
                className="text-xs text-muted-foreground mt-2 text-center"
              >
                ← {t("common.back")}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
