import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, Send, X, Loader2, CheckCircle2, Dumbbell, Utensils, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";

interface AICoachStripProps {
  greeting: string;
  firstName: string;
}

type Msg = { role: "user" | "assistant"; content: string; planData?: any; planAction?: string };

const planIcons: Record<string, any> = {
  physio: Activity,
  diet: Utensils,
  workout: Dumbbell,
};

export default function AICoachStrip({ greeting, firstName }: AICoachStripProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hour = new Date().getHours();
  const nudge = hour < 12
    ? "Let's make today count ☀️"
    : hour < 17
    ? "How's your afternoon going? 🌤️"
    : "Time to wind down & reflect 🌙";

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      // Fetch preferences & active plans for context
      let preferences = null;
      let activePlans: any[] = [];

      if (user) {
        const [prefRes, recRes, dietRes] = await Promise.all([
          supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("recovery_plans").select("id, plan_type, title, started_at").eq("user_id", user.id).eq("is_active", true),
          supabase.from("diet_plans").select("id, title, started_at").eq("user_id", user.id).eq("is_active", true),
        ]);
        preferences = prefRes.data;
        if (recRes.data) {
          activePlans.push(...recRes.data.map((p: any) => ({
            ...p,
            day: Math.max(1, Math.floor((Date.now() - new Date(p.started_at).getTime()) / 86400000)),
          })));
        }
        if (dietRes.data) {
          activePlans.push(...dietRes.data.map((p: any) => ({
            ...p,
            plan_type: "diet",
            day: Math.max(1, Math.floor((Date.now() - new Date(p.started_at).getTime()) / 86400000)),
          })));
        }
      }

      const history = updatedMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: {
          message: text.trim(),
          history,
          preferences,
          activePlans,
          language: localStorage.getItem("lovelist-language") || "en",
        },
      });

      if (error) throw error;

      const action = data?.action;
      const responseData = data?.data;

      if (action === "create_plan" || action === "modify_plan") {
        const assistantMsg: Msg = {
          role: "assistant",
          content: action === "create_plan"
            ? `✅ I've created your **${responseData.title}** plan! Here's what I've put together:`
            : `✅ Plan updated! Here are the changes:`,
          planData: responseData,
          planAction: action,
        };
        setMessages([...updatedMessages, assistantMsg]);
      } else if (action === "navigate_to") {
        const assistantMsg: Msg = {
          role: "assistant",
          content: responseData.message || `Let me take you to the ${responseData.page} section.`,
        };
        setMessages([...updatedMessages, assistantMsg]);
      } else {
        const msg = responseData?.message || "I'm here to help! What would you like to work on?";
        const followUp = responseData?.follow_up_question;
        const assistantMsg: Msg = {
          role: "assistant",
          content: followUp ? `${msg}\n\n${followUp}` : msg,
        };
        setMessages([...updatedMessages, assistantMsg]);
      }
    } catch (e: any) {
      console.error("AI Coach error:", e);
      setMessages([...updatedMessages, {
        role: "assistant",
        content: "Sorry, I'm having trouble connecting right now. Please try again! 🙏",
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Collapsed strip */}
      {!open && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 rounded-glass bg-card/60 backdrop-blur-glass border border-border/40 px-4 py-3 shadow-card transition-all hover:shadow-elevated"
          style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)", backdropFilter: "blur(40px) saturate(1.8)" }}
        >
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0 animate-glow-pulse">
            <Sparkles size={18} className="text-primary" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs text-muted-foreground font-medium">AI Coach</p>
            <p className="text-sm font-semibold text-foreground truncate">{nudge}</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground shrink-0" />
        </motion.button>
      )}

      {/* Expanded inline chat */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="rounded-2xl bg-card/80 backdrop-blur-glass border border-border/40 shadow-elevated overflow-hidden"
            style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)", backdropFilter: "blur(40px) saturate(1.8)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                  <Sparkles size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">PAI Coach</p>
                  <p className="text-[10px] text-muted-foreground">Your AI Life Coach</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="max-h-[320px] overflow-y-auto px-4 py-3 space-y-3 scroll-smooth">
              {messages.length === 0 && (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Sparkles size={20} className="text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Hey {firstName}! {nudge}<br />
                    <span className="text-xs">Tell me what you'd like to work on — I can create plans for fitness, diet, recovery & more.</span>
                  </p>
                  {/* Quick prompts */}
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {["Create a workout plan", "Help me eat better", "I have back pain"].map(q => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="text-[11px] px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted/60 text-foreground rounded-bl-md"
                  }`}>
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>p]:leading-relaxed">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>

                    {/* Plan card */}
                    {m.planData && m.planData.phases && (
                      <div className="mt-3 rounded-xl bg-background/60 border border-border/40 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const Icon = planIcons[m.planData.plan_type] || Activity;
                            return <Icon size={14} className="text-primary" />;
                          })()}
                          <span className="text-xs font-bold text-foreground">{m.planData.title}</span>
                          {m.planData.plan_id && (
                            <CheckCircle2 size={12} className="text-green-500 ml-auto" />
                          )}
                        </div>
                        {m.planData.phases.slice(0, 2).map((phase: any, pi: number) => (
                          <div key={pi} className="space-y-1">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                              {phase.name} · {phase.duration_days}d
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {phase.exercises?.slice(0, 4).map((ex: any, ei: number) => (
                                <span key={ei} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                  {ex.name}
                                </span>
                              ))}
                              {(phase.exercises?.length || 0) > 4 && (
                                <span className="text-[10px] text-muted-foreground">+{phase.exercises.length - 4} more</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {m.planData.phases.length > 2 && (
                          <p className="text-[10px] text-muted-foreground">+{m.planData.phases.length - 2} more phases</p>
                        )}
                        {m.planData.plan_id && (
                          <p className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle2 size={10} /> Saved & tracking
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="px-3 py-2.5 border-t border-border/30 flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask PAI anything..."
                disabled={loading}
                className="flex-1 bg-muted/40 rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 border border-border/30 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
